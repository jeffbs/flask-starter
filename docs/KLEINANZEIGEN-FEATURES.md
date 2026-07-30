# Kleinanzeigen (ehem. eBay Kleinanzeigen) — vollständige Funktionsübersicht

Zusammenstellung aller Funktionen der Plattform Kleinanzeigen.de (Web + App),
inkl. der gewerblichen PRO-Funktionen. Stand: Juli 2026.

Spalte **B2BMarkt** ordnet jede Funktion unserem Projekt zu:
- `✅ ID` — bereits im Anforderungskatalog (`ANFORDERUNGEN.md`) mit dieser ID
- `➕ NEU` — fehlt bisher im Katalog → Review-Entscheidung nötig
- `➖ entfällt` — für B2B-only / App-only nicht sinnvoll

---

## 1. Konto & Profil

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Registrierung per E-Mail | Konto mit E-Mail + Passwort | ✅ AUTH-1 |
| Social Login (Google/Apple) | Anmeldung über Drittanbieter | ➕ NEU (Stufe 3?) |
| E-Mail-Bestätigung | Bestätigungslink nach Registrierung | ✅ AUTH-8 (Stufe 2) |
| Telefon-Verifizierung | SMS-Code als Vertrauenssignal | ➖ entfällt (ersetzt durch strenges KYB) |
| Privat- vs. gewerbliches Konto | Kontotyp mit Umstellmöglichkeit | ➖ entfällt (nur B2B) |
| Nutzerprofil öffentlich | Name, Bild, „Aktiv seit", Anzeigenzahl, typische Antwortzeit | ✅ teilw. (INS-7: Firmenprofil); Antwortzeit ➕ NEU (Stufe 3) |
| Impressum & Rechtstexte | Pflicht für gewerbliche Anbieter (Impressum, AGB, Widerruf) | ➕ NEU — für B2B **Pflicht** (Impressumsfelder am Firmenprofil) |
| Bewertungen | Nutzer bewerten sich gegenseitig (Freundlichkeit, Zuverlässigkeit) | Stufe 3 (bewusst verschoben, Missbrauchskonzept nötig) |
| Abzeichen | Freundlichkeits-, Zuverlässigkeits-, Nachhaltigkeits-Badges | ➖ entfällt (B2C-Gamification); Ersatz: „Verifiziert"-Badge = KYB |
| Profil folgen / Follower | Nutzern folgen, Follower sehen & entfernen (PRO) | ➕ NEU (Stufe 3: „Firma folgen") |
| Konto-Einstellungen | Passwort ändern, E-Mail ändern, Benachrichtigungen | ✅ AUTH-6, PUSH-4 |
| Konto löschen | Selbstlöschung inkl. Daten (DSGVO) | ✅ NFA-5 |

## 2. Anzeigen erstellen & verwalten

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Anzeige aufgeben | Titel, Beschreibung, Kategorie, Preis, Bilder (bis 20), Standort | ✅ INS-2, INS-4 |
| Anzeigentyp **Angebot / Gesuch** | Auch Kaufgesuche inserierbar | ➕ NEU — für B2B sehr sinnvoll (Einkäufer suchen Ware) |
| Preistypen | Festpreis, VB, „Zu verschenken" | ✅ INS-3 (Festpreis/VB/auf Anfrage); „Zu verschenken" ➕ NEU (Restposten?) |
| Kategoriespezifische Attribute | Pflicht-/Filterfelder je Kategorie (z. B. Marke, Baujahr, km) | ✅ KAT-4 (Stufe 2) |
| Versand anbieten / Nur Abholung | Versandoption als Anzeigen-Eigenschaft + Suchfilter | ➕ NEU — als einfaches Flag sinnvoll fürs MVP |
| Versandintegration | DHL/Hermes-Label direkt aus dem Chat kaufen, Tracking | Stufe 3 (mit CHAT-10) |
| „Reserviert"-Markierung | Anzeige als reserviert kennzeichnen | ➕ NEU — kleiner Zusatz-Status, sinnvoll |
| Bearbeiten / Pausieren / Löschen | Volle Verwaltung eigener Anzeigen | ✅ INS-6 |
| Laufzeit & Ablauf | Anzeigen laufen nach fester Zeit ab | ✅ INS-5 |
| Verlängern / Erneuern | Abgelaufene Anzeige reaktivieren | ✅ INS-9 (Stufe 2) |
| Anzeigen-Vorlagen | Anzeige duplizieren / „Als Vorlage verwenden" (PRO) | ➕ NEU (Stufe 2) — für B2B-Vielinserenten wertvoll |
| Anzeigenstatistiken | Besucher, Merkungen pro Anzeige | ✅ INS-10 (Stufe 2) |
| Max. Anzahl Gratis-Anzeigen | Kontingent, darüber kostenpflichtig | ➕ NEU (Stufe 3, Monetarisierung) |

## 3. Sichtbarkeit & Monetarisierung (Zusatzoptionen)

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Hochschieben | Anzeige erscheint wieder wie neu eingestellt | ✅ INS-11 (Stufe 3) |
| Top-Anzeige | Fixe Top-Platzierung in der Kategorie | ✅ INS-11 (Stufe 3) |
| Highlight | Farbliche Hervorhebung in der Ergebnisliste | ✅ INS-11 (Stufe 3) |
| Galerie | Platzierung in der Startseiten-Galerie | ✅ INS-11 (Stufe 3) |
| Startseitenplatzierung (PRO) | Karussell „Lokal einkaufen — Shops aus der Region" | Stufe 3 |
| Sichtbarkeitspakete | Gebündelte Hervorhebungen (z. B. Immobilienprofis) | Stufe 3 |
| Werbeanzeigen Dritter | Display-Ads auf der Plattform | ➖ entfällt (Geschäftsmodell-Entscheidung) |

## 4. Suchen & Entdecken

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Volltextsuche | Suche über Titel/Beschreibung, Autovervollständigung | ✅ SUCHE-1; Vorschläge SUCHE-7 (Stufe 3) |
| Kategoriebaum | Durchstöbern nach Haupt-/Unterkategorien | ✅ KAT-1, KAT-2 |
| Umkreissuche | Ort/PLZ/GPS + Radius | ✅ SUCHE-5 (Stufe 2; MVP: PLZ-Region SUCHE-2) |
| Filter | Preis, Zustand, Angebot/Gesuch, Versand möglich, privat/gewerblich | ✅ SUCHE-2; Gesuch+Versand-Filter ➕ NEU; privat/gewerblich ➖ entfällt |
| Sortierung | Neueste, günstigste, teuerste | ✅ SUCHE-3 |
| Suchaufträge / Suchagent | Gespeicherte Suche mit Push bei neuen Treffern | ✅ SUCHE-6 (Stufe 2) |
| Merkliste | Anzeigen favorisieren | ✅ FAV-1, FAV-2 |
| Zuletzt angesehen | Verlauf der betrachteten Anzeigen | ➕ NEU (Stufe 3, rein clientseitig möglich) |
| Startseiten-Feed | Empfehlungen, Neues aus der Region | ➕ NEU (MVP: einfach „Neueste"; Personalisierung Stufe 3) |
| Anzeige teilen | Link teilen (WhatsApp, E-Mail, …) | ✅ APP-9 (Stufe 2) |

## 5. Kommunikation

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Chat pro Anzeige | 1:1-Nachrichten zwischen Interessent und Anbieter | ✅ CHAT-1 … CHAT-7 |
| Preisvorschlag / Angebot machen | Strukturiertes Preisangebot im Chat | ✅ CHAT-3, CHAT-4 |
| Bilder & Dateien im Chat | Anhänge senden (z. B. PDF) | ✅ CHAT-8 (Stufe 2) — für B2B (Datenblätter!) ggf. hochziehen |
| Kontaktformular mit Anzeigen-Übersicht | Vor Erstkontakt: Preis, Zustand, Versand kompakt | ➕ NEU (UI-Detail, Stufe 2) |
| Telefonnummer in Anzeige | Optional Rückrufnummer angeben | ➕ NEU — B2B-üblich, einfaches Feld |
| Ungelesen-Badges | Zähler in Übersicht + App-Icon | ✅ CHAT-5 |
| Nutzer blockieren | Keine weiteren Nachrichten möglich | ✅ CHAT-9 (Stufe 2) |
| Betrugswarnungen im Chat | Automatische Sicherheitshinweise bei verdächtigen Mustern | Stufe 3 (MOD-6-Verwandt) |
| Smart Replies | Schnellantwort-Vorschläge | ➖ entfällt (nice-to-have) |

## 6. Bezahlen & Käuferschutz

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| „Sicher bezahlen" | Integrierte Zahlung mit Käuferschutz (Gebühr) | ✅ CHAT-10 (Stufe 3) |
| Direkt kaufen | Sofortkauf zum Festpreis inkl. Zahlung | ✅ CHAT-10 (Stufe 3) |
| Angebot senden/annehmen im Zahlungsflow | Verbindliches Angebot mit Zahlungsabwicklung | Stufe 3 |
| Versandetikett & Tracking | Label-Kauf, Sendungsverfolgung im Chat | Stufe 3 |
| **B2B-Besonderheit** | — Kleinanzeigen hat das nicht: Rechnungskauf, USt-Ausweis, Skonto | ➕ NEU (Stufe 3, aber B2B-differenzierend) |

## 7. Sicherheit & Moderation

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| Anzeige melden | Meldegründe, Prüfe durch Moderation | ✅ MOD-1, MOD-2 |
| Nutzer melden | Profil melden | ✅ MOD-1 |
| Automatische Anzeigenprüfung | Filter vor/nach Veröffentlichung (Betrug, verbotene Artikel) | ✅ MOD-6 (Stufe 2) |
| Verbotene-Artikel-Richtlinie | Katalog unzulässiger Waren | ➕ NEU — Inhalte-Richtlinie als Doku + Moderationsgrundlage (MVP-Doku) |
| Hilfe-Center & Support | FAQ, Kontaktformular | ➕ NEU (Stufe 2: einfacher Support-Kontakt in der App) |
| Sicherheitshinweise | Ratgeberseiten | ➖ entfällt (App-only; ggf. FAQ-Screen Stufe 3) |

## 8. Gewerbliche Funktionen (Kleinanzeigen PRO) — unser Kernpublikum

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| PRO-Pakete | Gestaffelte Abos mit Anzeigenkontingenten | Stufe 3 (Monetarisierung) |
| Business Portal | Zentrale Verwaltung: Anzeigen, Nachrichten, Statistiken | ✅ entspricht unserem Firmen-Bereich in der App; erweitertes Dashboard Stufe 2 |
| Shop-/Unternehmensseite | Logo, Banner, Beschreibung, alle Anzeigen der Firma | ➕ NEU — Firmenprofil-Screen mit allen Inseraten (MVP-nah: SUCHE-2 kann bereits nach Firma filtern) |
| Service-Labels | „Verkäufergarantie", „schneller Versand" als Badge | ➕ NEU (Stufe 2) |
| Favoriten-Ansprache | Nachricht an Nutzer, die Anzeige gemerkt haben | ➕ NEU (Stufe 3; Spam-Risiko beachten) |
| Anzeigen-Import / API | Massen-Upload, Warenwirtschafts-Anbindung, CSV | ➕ NEU (Stufe 2/3 — für B2B-Händler mit Sortiment sehr relevant) |
| Mehrere Nutzer pro Konto | Bei Kleinanzeigen kaum vorhanden — bei uns von Anfang an konzipiert | ✅ AUTH-10 (Stufe 2) |
| Statistiken/Reporting | Performance der Anzeigen | ✅ INS-10 (Stufe 2) |

## 9. Kategorien-Spezialbereiche von Kleinanzeigen

| Bereich | Besonderheit | B2BMarkt |
|---|---|---|
| Auto, Rad & Boot | Fahrzeugattribute (km, EZ, TÜV), Finanzierungs-Leads | Attribute via KAT-4 (Stufe 2); Nutzfahrzeuge-Kategorie ✅ im Seed |
| Immobilien | Exposés, Sichtbarkeitspakete für Makler | Gewerbeimmobilien-Kategorie ✅ im Seed; Exposé-Felder Stufe 3 |
| Jobs | Stellenanzeigen mit Bewerbungsflow | ➖ entfällt (eigenes Produkt; ggf. Stufe 3 „Gewerbe-Jobs") |
| Dienstleistungen | Anbieterverzeichnis | ✅ Kategorie im Seed |
| Nachbarschaft / Verschenken | Community-Bereich | ➖ entfällt (B2C) |

## 10. Plattform & Benachrichtigungen

| Funktion | Beschreibung | B2BMarkt |
|---|---|---|
| iOS- & Android-App | Native Apps | ✅ APP-1 … APP-10 (Expo) |
| Website (Desktop/Mobile) | Vollwertige Web-Oberfläche | ➖ entfällt (Vorgabe: nur App + Backoffice) |
| Push-Benachrichtigungen | Nachrichten, Suchagent, Preisänderung Merkliste, System | ✅ PUSH-1 … PUSH-3; FAV-3, SUCHE-6 (Stufe 2) |
| E-Mail-Benachrichtigungen | Parallel zu Push | ➕ NEU (Stufe 2, mit AUTH-8/9-Mailversand) |
| Benachrichtigungszentrale | Glocke mit Verlauf in der App | ✅ PUSH-5 (Stufe 2) |
| Benachrichtigungs-Einstellungen | Pro Kanal/Ereignis konfigurierbar | ✅ PUSH-4 (Stufe 2) |
| Deep-Links | Direktsprung zu Anzeige/Chat | ✅ APP-9 (Stufe 2) |

---

## Für das Review: die wichtigsten Lücken (`➕ NEU`) zur Entscheidung

**MVP-Kandidaten (klein & wertvoll):**
1. **Gesuche** (Angebot/Gesuch-Typ) — B2B-Einkäufer inserieren, was sie suchen
2. **Versand-Flag** („Versand möglich" / „Nur Abholung") + Suchfilter
3. **„Reserviert"-Status** für Inserate
4. **Telefonnummer** optional am Inserat
5. **Impressumsfelder** am Firmenprofil (für B2B rechtlich geboten)
6. **Firmenprofil-Screen** in der App (alle Inserate einer Firma)
7. **Verbotene-Artikel-Richtlinie** als Moderationsgrundlage (Doku)

**Stufe-2-Kandidaten:** Anzeigen-Vorlagen/Duplizieren, Service-Labels, E-Mail-Benachrichtigungen, Kontaktformular-Übersicht, Chat-Anhänge hochziehen (Datenblätter!)

**Stufe-3-Kandidaten:** Sichtbarkeits-Optionen (Hochschieben/Top/Galerie), PRO-Pakete/Kontingente, Favoriten-Ansprache, Anzeigen-Import/API, Bewertungen, „Sicher bezahlen"/Direkt kaufen mit B2B-Twist (Rechnungskauf), Firma folgen, Social Login

---

### Quellen

- [Kleinanzeigen App (App Store)](https://apps.apple.com/de/app/kleinanzeigen-dein-marktplatz/id382596778)
- [Mobile Apps | Kleinanzeigen](https://themen.kleinanzeigen.de/mobile-apps/)
- [Kleinanzeigen PRO für gewerbliche Nutzer (Help Center)](https://hilfe.kleinanzeigen.de/hc/de/articles/17128726620316-Kleinanzeigen-PRO-f%C3%BCr-gewerbliche-Nutzer)
- [Kleinanzeigen PRO Funktionen und Preise (onlinemarktplatz.de)](https://onlinemarktplatz.de/262505/kleinanzeigen-pro-funktionen-und-preise/)
- [Neue PRO-Funktionen (Pressemitteilung)](https://themen.kleinanzeigen.de/medien/pressemitteilungen/neue-pro-funktionen-kleinanzeigen-starkt-moglichkeiten-gewerblicher-handler/)
- [Kleinanzeigen PRO: Drei neue Funktionen (digital-magazin.de)](https://digital-magazin.de/kleinanzeigen-pro-erweitert-features/)
- [Neue Funktionen für Power-User (mydealz Magazin)](https://magazin.mydealz.de/kleinanzeigen-diese-3-neuen-features-sollen-pro-accounts-effizienter-und-sicherer-machen-37089)
- [Welche Hervorhebungsfunktionen gibt es? (Help Center)](https://hilfe.kleinanzeigen.de/hc/de/articles/17078570707996-Welche-Hervorhebungsfunktionen-gibt-es)
- [Was ist eine Top-Anzeige? (Help Center)](https://themen.kleinanzeigen.de/hilfe/anzeigen-hervorheben/topanzeige/)
- [Was ist ein Highlight? (Help Center)](https://themen.kleinanzeigen.de/hilfe/anzeigen-hervorheben/highlight/)
- [Sichtbarkeitspakete für Immobilienprofis](https://themen.kleinanzeigen.de/immobilienprofis/sichtbarkeitspakete/)
- [Woraus besteht mein Nutzerprofil? (Help Center)](https://hilfe.kleinanzeigen.de/hc/de/articles/17113513090460-Woraus-besteht-mein-Nutzerprofil)
- [Nutzer bewerten (Help Center)](https://hilfe.kleinanzeigen.de/hc/de/articles/17106550059164-Nutzer-bewerten)
- [Follower-Funktion (Pressemitteilung)](https://themen.kleinanzeigen.de/medien/pressemitteilungen/neue-funktion-nutzer-konnen-jetzt-sehen-wer-ihnen-auf-kleinanzeigen-folgt/)
- [Gewerblich handeln auf Kleinanzeigen](https://themen.kleinanzeigen.de/gewerblich-handeln/)
