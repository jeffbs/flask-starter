# UI-Brief — B2BMarkt Mobile App

Ergebnis des `impeccable shape`-Durchlaufs (Discovery → Concept-Seed-Wurf →
Nutzerentscheidung). Status: **zur Bestätigung vorgelegt**. Dieser Brief plant;
er implementiert nicht. Umsetzung folgt nach Freigabe testgetrieben gemäß
`TESTSTRATEGIE.md` (Anforderungs-IDs aus `ANFORDERUNGEN.md` in Klammern).

---

## 1. Job & Publikum

Geschäftsführer:innen und Einkäufer:innen kleiner Gewerbebetriebe, unterwegs
zwischen Lager, Baustelle und Werkstatt, in kurzen Smartphone-Sessions.
Visitor-Mode: **Operate** — sie kommen, um eine Aufgabe zu erledigen (finden,
anfragen, antworten, inserieren), nicht um zu schmökern. Scanbarkeit,
Konsistenz und vertraute Bedienmuster schlagen Expression.

## 2. Ergebnis & Beweis

Primäre Aufgaben: (a) passende Ware finden und den Anbieter anfragen,
(b) eigene Ware in Minuten inserieren, (c) laufende Verhandlungen fortführen.
Erfolg: Anfrage gesendet / Inserat live / Preisvorschlag beantwortet — jeweils
in wenigen Interaktionen. Produktbeweis in der UI: **jede Firma trägt sichtbar
ihren Verifizierungsstatus** („Geprüfte Firma" mit Häkchen-Siegel + „geprüft
seit …" im Profil). Das ist Produktwahrheit (strenges KYB), kein Dekor.

## 3. Gewählte Richtung (bestätigt)

**Kleinanzeigen-Standard, in voller Qualität und ohne Ironie ausgeführt.**
Der Nutzer hat die Konvention dem Concept-Roll bewusst vorgezogen (Standing
Preference, in `apps/mobile/PRODUCT.md` festgehalten). Craft-Messlatte: die
Kleinanzeigen-App selbst.

Konkret heißt das:

- **Grammatik:** weiße Cards auf hellgrauem Grund, runde Ecken (moderat, ~12 dp),
  eine freundliche grüne Akzentfarbe für alle Primäraktionen, System-Schrift
  (SF Pro / Roboto via Dynamic Type bzw. sp), Listenzeilen mit linkem
  Foto-Thumbnail, Bottom-Tab-Navigation, Sheet-Modals für fokussierte Aufgaben.
- **Eine Marken-UI auf beiden Plattformen** (bestätigt); nativ bleiben nur
  Systemgarantien: Safe Areas, Edge-Swipe-Back (iOS), System-Back/Predictive
  Back (Android), 44 pt / 48 dp Touchziele, Dynamic Type/sp, Dark Mode als
  gleichwertige Erscheinung.
- **B2B-Eigenheit innerhalb der Konvention:** das Geprüft-Siegel, Netto/Brutto-
  Kennzeichen am Preis, Menge + Einheit („200 Stück · 7,50 € netto/Stk."),
  Firmenname statt Vorname. Keine weiteren visuellen Sonderwege.
- **Signatur-Moment (im Rahmen der Konvention):** die Preisvorschlag-Karte im
  Chat — strukturiert wie bei Kleinanzeigen „Preis vorschlagen", mit klaren
  Zuständen (offen / angenommen / abgelehnt / zurückgezogen) und dezenter,
  ehrlicher Statusfarbe. Kein Stempel-Theater.

## 4. Scope & Grenzen

- **Fidelity:** produktionsreifer Plan für alle MVP-Screens (APP-1 … APP-8);
  Stufe-2-Screens (Deep-Links, Offline-UI) nur als Hooks mitgedacht.
- **Unangetastet bleibt:** API-Vertrag (`apps/api`), Anforderungskatalog,
  Fünf-Tab-Struktur, deutsche Sprache, EUR.
- **Anti-Goals:** keine Gamification, kein erfundener Social Proof, keine
  Badge-Sammelei, keine per-OS-Designsprachen, keine Dark Patterns
  (z. B. versteckte Kündigung der Anzeige), kein Onboarding-Karussell.

## 5. Navigationsgerüst

```
Nicht angemeldet:  Login ── Registrieren (Firma + Inhaber, 2 Schritte)
Angemeldet (Tabs):
  1 Entdecken   Feed/Suche → Inserat-Detail → Firmenprofil
  2 Merkliste   Liste → Inserat-Detail
  3 Einstellen  (+, zentral hervorgehoben) → Inserat-Formular (Modal-Stack)
  4 Nachrichten Unterhaltungsliste → Chat-Thread
  5 Meins       Profil-Hub → Meine Inserate / KYB-Verifizierung /
                Firmenprofil bearbeiten / Einstellungen
Querbezüge: Push → Chat-Thread · Inserat-Detail → Chat · Detail → Firmenprofil
            → deren Inserate (gefiltertes Entdecken)
```

## 6. Screens im Einzelnen

### 6.1 Login / Registrierung (APP-1, AUTH-1)
- Login: Logo-Platzhalter, E-Mail, Passwort, Primärbutton, Link zu Registrieren.
  Fehler als Inline-Text unterm Feld, nie als Alert.
- Registrieren in **zwei Schritten** (ein Formular pro Screen, Fortschritt
  „1/2 Firma · 2/2 Zugang"): Firma (Name, Rechtsform, Anschrift) → Konto
  (Name, E-Mail, Passwort). Nach Abschluss direkt eingeloggt, sanfter Hinweis-
  Banner „Verifizierung starten" statt Zwangs-Flow.

### 6.2 Entdecken (APP-3, SUCHE-1…4)
- Kopf: Suchfeld (Placeholder „Wonach sucht Ihr Betrieb?"), darunter horizontale
  Kategorie-Chips; Filter-Button öffnet Sheet (Kategorie-Baum, Preis von/bis,
  Zustand, PLZ, Sortierung) mit Ergebnis-Zähler-Button („132 Ergebnisse zeigen").
- Ergebnis: **Listenzeilen** (Kleinanzeigen-Muster): Thumbnail 96 dp links,
  Titel 2-zeilig, Preis fett + „netto/brutto" klein, PLZ Ort, Zeitstempel,
  Herz-Icon rechts oben; Firmenzeile mit Geprüft-Siegel. Infinite Scroll,
  Pull-to-Refresh, Skeleton-Zeilen beim Laden.
- Leerzustände: „Keine Treffer — Filter lockern?" mit Aktion; Erststart zeigt
  neueste Inserate (kein leerer Feed).

### 6.3 Inserat-Detail (APP-4, INS-7)
- Foto-Galerie edge-to-edge (Swipe + Punkte-Indikator), darunter: Preisblock
  (Preis groß, Preistyp „VB"/„Festpreis"/„auf Anfrage", netto-Kennzeichen,
  Menge/Einheit), Titel, Meta (Kategorie, Zustand, PLZ Ort, Aufrufe, Datum).
- Firmen-Card: Name + Geprüft-Siegel, Ort, „geprüft seit", Chevron →
  Firmenprofil. Beschreibung als aufklappbarer Textblock. „Inserat melden"
  dezent am Ende.
- **Sticky Bottom-Bar:** „Nachricht" (Sekundär) + „Preis vorschlagen" (Primär)
  — bzw. bei eigenem Inserat „Bearbeiten"/„Status ändern". Für unverifizierte
  Firmen sind die Buttons aktiv, führen aber zum KYB-Gate-Sheet (6.8).

### 6.4 Einstellen (APP-5, INS-1…5)
- Ein scrollbares Formular (kein Wizard): Fotos zuerst (Kamera/Galerie,
  Reihenfolge per Drag, erstes Foto = Titelbild-Label), Titel, Kategorie
  (Sheet mit Baum), Beschreibung, Preisblock (Betrag, Typ-Segmente
  Festpreis/VB/auf Anfrage, netto/brutto-Toggle), Zustand, Menge + Einheit,
  PLZ/Ort (vorbelegt aus Firmenprofil), optional Telefon.
- Primärbutton „Inserat veröffentlichen" fix am Ende; Validierung inline beim
  Verlassen des Felds (NFA-1-Fehlertexte der API 1:1 anzeigbar).
- Unverifiziert: Tab zeigt statt Formular den KYB-Status-Screen (6.8) mit
  klarer Erklärung — das Formular wird nie „tot" angezeigt.

### 6.5 Merkliste (APP-2, FAV-1/2)
- Gleiche Listenzeilen wie Entdecken; nicht mehr aktive Inserate bleiben mit
  Status-Badge („Verkauft", „Pausiert") sichtbar und ausgegraut.
- Leer: freundlicher Hinweis + Button „Jetzt stöbern" → Tab 1.

### 6.6 Nachrichten & Chat (APP-6, CHAT-1…7)
- Liste: Avatar-Ersatz = Inserat-Thumbnail, Firmenname + Geprüft-Siegel,
  Inserats-Titel klein, letzte Nachricht 1-zeilig, Zeit, Ungelesen-Punkt +
  Zähler-Badge am Tab.
- Thread: Kopf mit Inserat-Mini-Card (Thumbnail, Titel, Preis → tippbar zum
  Detail). Nachrichtenblasen konventionell (eigene rechts/grün-getönt).
  **Preisvorschlag-Karte:** Betrag groß, Status-Chip, bei Gegenseite-offen
  Buttons „Annehmen" / „Ablehnen", eigener offener Vorschlag: „Zurückziehen".
  Systemnachrichten zentriert, klein. Eingabezeile mit „+"-Menü
  (Preis vorschlagen). Echtzeit-Updates via WebSocket, optimistisches Senden
  mit Sende-Status.

### 6.7 Meins (APP-7)
- Kopf: Firmenname + Verifizierungsstatus-Karte (Zustand UNVERIFIED /
  PENDING_REVIEW / VERIFIED / REJECTED / SUSPENDED — jeweils mit nächster
  Aktion bzw. Begründung, KYB-6/7, „Ehrliche Zustände"-Prinzip).
- Sektionen: Meine Inserate (mit Status-Verwaltung: pausieren, reaktivieren,
  verkauft, löschen — Swipe-Aktionen + Detail-Menü), Firmenprofil bearbeiten,
  Benachrichtigungen, Abmelden. Version + Rechtliches im Fuß.

### 6.8 KYB-Verifizierung (APP-7, KYB-1…7)
- Status-Screen mit Zeitleiste (Eingereicht → In Prüfung → Ergebnis).
- Formular: USt-IdNr. (Format-Validierung live), HR-Nummer + Registergericht,
  Dokumenten-Upload (Kamera/Datei, Typ-Auswahl je Dokument). Ablehnung zeigt
  die Admin-Begründung prominent + „Erneut einreichen".
- **KYB-Gate-Sheet** (wiederverwendbar): erscheint, wenn Unverifizierte
  inserieren/anfragen wollen — erklärt warum, zeigt Status, CTA „Verifizierung
  starten"/„Status ansehen". Niemals kommentarloses Deaktivieren.

## 7. Zustände & Mengengerüste

- Titel 5–120 Zeichen (2 Zeilen + Ellipse), Beschreibung bis 20 000 Z.
  (aufklappbar), 0–20 Bilder (Galerie degradiert sauber auf 0 Bilder mit
  Kategorie-Platzhalter), Preise 0 € – 10 Mio. € (Tabellenziffern, Umbruch
  getestet), Chat-Verläufe bis 500 Nachrichten (virtualisiert).
- Jeder Screen definiert: Laden (Skeleton), Leer (Text + Aktion), Fehler
  (Retry-Karte), Offline-Banner. Push-Berechtigung wird **nach** Login und
  erst bei Relevanz angefragt (erste Unterhaltung oder Meins-Hinweis), nie
  als Cold-Start-Dialog (APP-8).

## 8. Komponentensystem (wiederverwendbar)

`ListingRow` · `ListingCard(Chat-Kopf)` · `PriceLabel` (Betrag+Typ+netto) ·
`VerifiedBadge` · `StatusChip` (Inserat-/Offer-/KYB-Status) · `OfferCard` ·
`CategoryChips` · `FilterSheet` · `KybGateSheet` · `EmptyState` ·
`SkeletonRow` · `FormField` (Label, Fehler, Hilfetext) · `StickyActionBar` ·
`SectionHeader` · Token: Farbe (Grün-Akzent, semantische Status-Farben,
Light/Dark), Radius, Spacing-Skala, Typo-Rollen (Dynamic Type / sp).

## 9. Bindende Constraints & offene Entscheidungen

**Bindend:** Expo/React Native · System-Schrift · 44 pt/48 dp Touchziele ·
Dynamic Type & sp · Dark Mode gleichwertig · deutsche UI-Texte per
zentralem Strings-Modul (i18n-Hook für Stufe 3) · WCAG-AA-Kontraste ·
Systemgesten unangetastet.

**Offen (bewusst nicht erfunden):**
1. Endgültiger Name + Logo (Arbeitstitel läuft als austauschbares Wortmark).
2. Exakter Grün-Ton (Token `accent`; Vorschlag folgt im Designsystem-Schritt,
   bewusst nicht Kleinanzeigen-Grün 1:1 — Verwechslungsgefahr/Markenrecht).
3. Illustrationsstil der Leerzustände (System-Icons vs. eigene Illustrationen).
4. App-Icon.

---

**Nächster Schritt nach Bestätigung:** TDD-Zyklen laut `TESTSTRATEGIE.md`;
UI-Umsetzung Screen für Screen gegen diesen Brief, Designsystem-Tokens zuerst.
