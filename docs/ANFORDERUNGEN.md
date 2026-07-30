# B2BMarkt — Anforderungskatalog

B2B-Kleinanzeigen-Marktplatz nach Vorbild eBay Kleinanzeigen, **ausschließlich für Geschäftskunden**.
Zugang nur über die Mobile App (iOS/Android) und ein Web-Backoffice für Administration — keine öffentliche Website.

Jede Anforderung hat eine ID (`XXX-n`), auf die Tests referenzieren (TDD, siehe `TESTSTRATEGIE.md`).
Priorität: **M** = MVP (Ausbaustufe 1), **2** = Ausbaustufe 2, **3** = später.

---

## 1. Rollen & Akteure

| Rolle | Beschreibung |
|---|---|
| **Owner** | Inhaber-Konto einer Firma; legt die Firma bei Registrierung an, volle Rechte innerhalb der Firma |
| **Member** | Mitarbeiterkonto einer Firma (Ausbaustufe 2: Einladung durch Owner) |
| **Admin** | Backoffice-Mitarbeiter des Marktplatzes; keiner Firma zugeordnet |

Es gibt **keinen Gastzugang**: Jede Nutzung der App erfordert ein angemeldetes Firmenkonto.

---

## 2. Konto & Authentifizierung (AUTH)

| ID | Prio | Anforderung |
|---|---|---|
| AUTH-1 | M | Registrierung legt **Firma + Owner-Nutzer** in einem Schritt an (Firmenname, Rechtsform, Anschrift; E-Mail, Passwort, Name). |
| AUTH-2 | M | E-Mail-Adressen sind systemweit eindeutig; Registrierung mit vergebener E-Mail wird mit 409 abgelehnt. |
| AUTH-3 | M | Passwörter: min. 8 Zeichen, werden ausschließlich als bcrypt-Hash gespeichert. |
| AUTH-4 | M | Login mit E-Mail + Passwort liefert ein JWT (30 Tage); falsche Credentials → 401 ohne Hinweis, welches Feld falsch war. |
| AUTH-5 | M | Deaktivierte Nutzer (`isActive=false`) können sich nicht anmelden (403). |
| AUTH-6 | M | `GET /me` liefert Nutzer- und Firmenprofil; Profilfelder (Name, Passwort) sind änderbar. |
| AUTH-7 | M | Alle fachlichen Endpunkte erfordern ein gültiges JWT (401 sonst). |
| AUTH-8 | 2 | E-Mail-Verifizierung per Bestätigungslink bei Registrierung. |
| AUTH-9 | 2 | Passwort-vergessen-Flow per E-Mail. |
| AUTH-10 | 2 | Owner kann Member-Konten einladen, deaktivieren und Rollen verwalten. |
| AUTH-11 | 3 | 2-Faktor-Authentifizierung (TOTP). |

## 3. KYB-Verifizierung — streng (KYB)

Firmen-Status-Maschine: `UNVERIFIED → PENDING_REVIEW → VERIFIED | REJECTED`; `REJECTED → PENDING_REVIEW` (erneut einreichen); Admin kann jederzeit `SUSPENDED` setzen/aufheben.

| ID | Prio | Anforderung |
|---|---|---|
| KYB-1 | M | Neue Firmen starten als `UNVERIFIED`. Unverifizierte Firmen können **nicht** inserieren und **keine** Unterhaltungen beginnen. |
| KYB-2 | M | KYB-Einreichung erfordert: USt-IdNr. (Formatprüfung je EU-Land), optional HR-Nummer + Registergericht, **mindestens ein Nachweisdokument** (Handelsregisterauszug, USt-Bescheinigung, Gewerbeanmeldung, …). |
| KYB-3 | M | USt-IdNr. ist systemweit eindeutig; bereits registrierte USt-IdNr. → 409. |
| KYB-4 | M | Einreichung setzt Status auf `PENDING_REVIEW`; erneute Einreichung während laufender Prüfung → 409; bei `VERIFIED` → 409. |
| KYB-5 | M | **Manuelle Freigabe** im Backoffice: Admin sieht Warteschlange, Firmendaten und Dokumente und gibt frei oder lehnt ab. Ablehnung erfordert eine Begründung, die der Firma angezeigt wird. |
| KYB-6 | M | Freigabe/Ablehnung wird der Firma per Push mitgeteilt und im Audit-Log festgehalten. |
| KYB-7 | M | Abgelehnte Firmen können mit korrigierten Daten erneut einreichen. |
| KYB-8 | 2 | Automatischer VIES-Abgleich der USt-IdNr. als Vorprüfung (Ergebnis dem Admin angezeigt, ersetzt die manuelle Freigabe nicht). |
| KYB-9 | 3 | Anbindung eines KYB-Providers (z. B. Handelsregister-API) zur automatischen Datenübernahme. |

## 4. Kategorien (KAT)

| ID | Prio | Anforderung |
|---|---|---|
| KAT-1 | M | Kategorien bilden einen Baum (2 Ebenen im MVP); jede Kategorie hat Name, eindeutigen Slug, Sortierung, Aktiv-Flag. |
| KAT-2 | M | App erhält den vollständigen aktiven Kategoriebaum; inaktive Kategorien sind für neue Inserate nicht wählbar. |
| KAT-3 | M | Admins verwalten Kategorien im Backoffice (anlegen, umbenennen, deaktivieren). Deaktivieren löscht keine bestehenden Inserate. |
| KAT-4 | 2 | Kategoriespezifische Attribute (z. B. Baujahr, Betriebsstunden) als konfigurierbares Schema. |

## 5. Inserate (INS)

Status-Maschine: `ACTIVE → PAUSED → ACTIVE`, `ACTIVE → SOLD`, `ACTIVE → EXPIRED` (Laufzeitende), Admin: `→ REMOVED` (mit Grund), `REMOVED → ACTIVE` (Wiederherstellen).

| ID | Prio | Anforderung |
|---|---|---|
| INS-1 | M | Nur `VERIFIED`-Firmen können Inserate anlegen (403 mit Fehlercode `COMPANY_NOT_VERIFIED` sonst). |
| INS-2 | M | Pflichtfelder: Titel (5–120 Z.), Beschreibung (10–20 000 Z.), Kategorie, PLZ, Ort. Optional: Zustand, Menge + Einheit, Bilder (max. 20). |
| INS-3 | M | Preis: Festpreis, VB oder „Preis auf Anfrage“; Preise in Cent (Integer); B2B-Kennzeichen Netto/Brutto. Ohne „auf Anfrage“ ist ein Preis Pflicht. |
| INS-4 | M | Bilder werden vorab hochgeladen (JPG/PNG/WebP/GIF, max. 15 MB) und dem Inserat geordnet zugewiesen; erstes Bild = Titelbild. |
| INS-5 | M | Inserate erscheinen sofort (`ACTIVE`, Publish-Zeitpunkt gesetzt); Laufzeit 60 Tage, danach `EXPIRED`. |
| INS-6 | M | Inserent kann bearbeiten, pausieren, reaktivieren, als verkauft markieren, löschen — nur eigene Inserate (403 sonst). Von Moderation entfernte Inserate sind nicht bearbeitbar. |
| INS-7 | M | Detailansicht zeigt Firma (Name, Ort, verifiziert-seit), Kategorie, alle Bilder; Aufrufzähler zählt Fremdaufrufe. |
| INS-8 | M | Nicht-aktive Inserate sind für Fremde unsichtbar (404), für Inserent und Admin sichtbar. |
| INS-9 | 2 | Ablauf-Erinnerung per Push + „Verlängern“-Funktion. |
| INS-10 | 2 | Anzeigenstatistiken für Inserenten (Aufrufe, Merkungen, Anfragen). |
| INS-11 | 3 | Hervorhebungen (Top-Anzeige, Galerie) als kostenpflichtige Zusatzoption. |

## 6. Suche & Stöbern (SUCHE)

| ID | Prio | Anforderung |
|---|---|---|
| SUCHE-1 | M | Volltextsuche über Titel + Beschreibung (case-insensitiv), kombinierbar mit allen Filtern. |
| SUCHE-2 | M | Filter: Kategorie (inkl. Unterkategorien), Preisspanne, Zustand, PLZ-Region, Firma. |
| SUCHE-3 | M | Sortierung: Neueste (Standard), Preis auf-/absteigend. Pagination (Standard 20, max. 100). |
| SUCHE-4 | M | Nur `ACTIVE`-Inserate erscheinen in Suchergebnissen. |
| SUCHE-5 | 2 | Umkreissuche mit Geokoordinaten (PLZ→Geo-Auflösung, Radius-Filter). |
| SUCHE-6 | 2 | Gespeicherte Suchen mit Push-Benachrichtigung bei neuen Treffern („Suchagent“). |
| SUCHE-7 | 3 | Suchindex (PostgreSQL tsvector oder Meilisearch) mit Relevanz-Ranking und Vorschlägen. |

## 7. Merkliste (FAV)

| ID | Prio | Anforderung |
|---|---|---|
| FAV-1 | M | Nutzer können aktive Inserate merken/entmerken (idempotent); Merkliste ist pro Nutzer. |
| FAV-2 | M | Merkliste zeigt auch inzwischen verkaufte/pausierte Inserate mit entsprechendem Status. |
| FAV-3 | 2 | Push-Hinweis bei Preissenkung gemerkter Inserate. |

## 8. Chat & Preisverhandlung (CHAT)

Preisvorschlag-Status-Maschine: `PENDING → ACCEPTED | DECLINED` (nur Empfänger-Firma) bzw. `PENDING → WITHDRAWN` (nur Absender-Firma).

| ID | Prio | Anforderung |
|---|---|---|
| CHAT-1 | M | Nur `VERIFIED`-Firmen können Unterhaltungen beginnen; pro (Inserat, Käufer-Firma) existiert genau eine Unterhaltung. |
| CHAT-2 | M | Eigene Inserate können nicht kontaktiert werden (400). |
| CHAT-3 | M | Nachrichtentypen: Text (1–10 000 Z.), Preisvorschlag (Betrag in Cent), Systemnachricht. |
| CHAT-4 | M | Auf offene Preisvorschläge reagiert die Gegenseite mit Annehmen/Ablehnen; der Absender kann zurückziehen. Reaktion auf eigene Vorschläge bzw. Fremd-Rückzug → 403; nicht mehr offene Vorschläge → 409. Jede Reaktion erzeugt eine Systemnachricht. |
| CHAT-5 | M | Unterhaltungsübersicht: Inserat, Gegenseite, letzte Nachricht, **Ungelesen-Zähler** (pro Firma via Lese-Zeitstempel); Öffnen des Verlaufs markiert als gelesen. |
| CHAT-6 | M | Zugriff auf Unterhaltungen nur für beteiligte Firmen (403 sonst); alle Nutzer einer Firma sehen die Unterhaltungen ihrer Firma. |
| CHAT-7 | M | Echtzeit-Zustellung neuer Nachrichten über WebSocket (JWT-authentifiziert); zusätzlich Push an die Gegenseite. |
| CHAT-8 | 2 | Bilder/Dateianhänge im Chat. |
| CHAT-9 | 2 | Nutzer/Firmen blockieren. |
| CHAT-10 | 3 | „Direkt kaufen“ mit Bezahlabwicklung + Käuferschutz (Payment-Provider). |

## 9. Push-Benachrichtigungen (PUSH)

| ID | Prio | Anforderung |
|---|---|---|
| PUSH-1 | M | App registriert Expo-Push-Token pro Gerät (Upsert); Logout entfernt das Token. |
| PUSH-2 | M | Push bei: neuer Nachricht/Preisvorschlag, Reaktion auf Preisvorschlag, KYB-Entscheidung, Inserats-Entfernung durch Moderation. |
| PUSH-3 | M | Push-Versand ist Best-Effort: Fehler beim Versand dürfen den auslösenden Request nie scheitern lassen. |
| PUSH-4 | 2 | Benachrichtigungs-Einstellungen pro Nutzer (welche Ereignisse). |
| PUSH-5 | 2 | In-App-Notification-Center (Liste vergangener Benachrichtigungen). |

## 10. Melden & Moderation (MOD)

| ID | Prio | Anforderung |
|---|---|---|
| MOD-1 | M | Nutzer können Inserate, Firmen und Nachrichten melden (Grund Pflicht, Details optional); nicht existierende Ziele → 404. |
| MOD-2 | M | Admins sehen Meldungen gefiltert nach Status (offen/erledigt/verworfen) und schließen sie mit Notiz ab. |
| MOD-3 | M | Admins entfernen Inserate mit Begründung (Firma erhält Push) und können sie wiederherstellen. |
| MOD-4 | M | Admins sperren Firmen (`SUSPENDED`): aktive Inserate werden pausiert; Entsperren stellt den vorherigen Verifizierungs-Status wieder her. |
| MOD-5 | M | Jede Admin-Aktion (KYB, Entfernen, Sperren, Kategorien) landet im **Audit-Log** (wer, was, wann, Begründung). |
| MOD-6 | 2 | Automatische Vorprüfung neuer Inserate (Wortfilter/ML) mit Prüf-Warteschlange. |

## 11. Backoffice (BO)

| ID | Prio | Anforderung |
|---|---|---|
| BO-1 | M | Login nur für `ADMIN`-Konten; Nicht-Admins werden abgewiesen. |
| BO-2 | M | Dashboard: offene KYB-Prüfungen, offene Meldungen, Firmen (gesamt/verifiziert), aktive Inserate, Nutzerzahl. |
| BO-3 | M | Firmenliste mit Status-Filter und Suche (Name, USt-IdNr., Ort); Detailseite mit Stammdaten, Nutzern, KYB-Dokumenten und Aktionen (KYB-Entscheidung, Sperren). |
| BO-4 | M | Inseratsliste mit Status-Filter und Titelsuche; Entfernen/Wiederherstellen direkt aus der Liste. |
| BO-5 | M | Meldungsliste mit Statusfilter und Abschluss-Aktionen. |
| BO-6 | M | Kategorienverwaltung (Baumansicht, anlegen, deaktivieren). |
| BO-7 | 2 | Einsicht ins Audit-Log im Backoffice. |
| BO-8 | 2 | Admin-Rollen (Support vs. Superadmin), Admin-Verwaltung im UI. |

## 12. Mobile App — Screens (APP)

| ID | Prio | Anforderung |
|---|---|---|
| APP-1 | M | Auth-Flow: Login, Registrierung (Firma + Owner); Session bleibt über App-Neustarts erhalten (Secure Storage); nicht angemeldete Nutzer sehen ausschließlich Auth-Screens. |
| APP-2 | M | Tab-Navigation: **Entdecken**, **Merkliste**, **Einstellen (+)**, **Nachrichten**, **Meins**. |
| APP-3 | M | Entdecken: Suchfeld, Kategorie-Auswahl, Filter, Ergebnisliste mit Titelbild/Titel/Preis/Ort, Infinite Scroll. |
| APP-4 | M | Inserats-Detail: Bildergalerie, Preis, Beschreibung, Firmenprofil-Block, Aktionen: merken, melden, Nachricht/Preisvorschlag senden. |
| APP-5 | M | Einstellen: Formular gemäß INS-2/INS-3 inkl. Kamera/Galerie-Upload; klare Sperre mit KYB-Hinweis, solange nicht verifiziert. |
| APP-6 | M | Nachrichten: Unterhaltungsliste mit Ungelesen-Badges; Chat-Thread mit Text + Preisvorschlägen (senden, annehmen, ablehnen, zurückziehen) und Echtzeit-Updates. |
| APP-7 | M | Meins: Firmen-/Nutzerprofil, KYB-Status + Einreichung (Formular + Dokument-Upload), eigene Inserate mit Statusverwaltung, Logout. |
| APP-8 | M | Push-Berechtigung wird nach Login angefragt; Tap auf Push öffnet die betreffende Unterhaltung. |
| APP-9 | 2 | Deep-Links (`b2bmarkt://listing/<id>`), Teilen von Inseraten. |
| APP-10 | 2 | Offline-Toleranz: Listen-Caches, Retry-UI bei Netzfehlern. |

## 13. Nicht-funktionale Anforderungen (NFA)

| ID | Prio | Anforderung |
|---|---|---|
| NFA-1 | M | Alle Eingaben werden serverseitig validiert (Zod); Validierungsfehler → 400 mit Feldliste, einheitliches Fehlerformat `{ error, issues? }`. |
| NFA-2 | M | AuthZ konsequent: fremde Ressourcen → 403/404; Admin-Endpunkte nur für Admins. |
| NFA-3 | M | Keine Klartext-Geheimnisse im Repo; Konfiguration über Env-Vars (`.env.example` dokumentiert). |
| NFA-4 | M | Datei-Uploads: Typ-Whitelist, Größenlimit, zufällige Dateinamen. |
| NFA-5 | M | DSGVO-Basis: Löschbarkeit von Konten (2), Datenminimierung, keine Tracking-SDKs im MVP. |
| NFA-6 | 2 | Rate-Limiting (Login, Registrierung, Nachrichten), Brute-Force-Schutz. |
| NFA-7 | 2 | Object-Storage (S3-kompatibel) statt lokaler Platte; CDN für Bilder; Bild-Resizing. |
| NFA-8 | 2 | Horizontale Skalierbarkeit Chat (Redis-PubSub statt In-Memory-Registry). |
| NFA-9 | 2 | CI-Pipeline: Typecheck, Tests, Build für alle Pakete bei jedem Push. |
| NFA-10 | 3 | Mehrsprachigkeit (i18n) — MVP ist Deutsch. |

---

## Explizit außerhalb des Scopes (vorerst)

- Öffentliche Website / SEO (nur App + Backoffice, per Anforderung des Auftraggebers)
- B2C / Privatnutzer (nur B2B, per Anforderung)
- Bezahlabwicklung, Käuferschutz, Versandintegration (CHAT-10, Stufe 3)
- Bewertungssystem für Firmen (Stufe 3, braucht Missbrauchskonzept)
