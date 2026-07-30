# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Geschäftsführer:innen und Einkäufer:innen kleiner und mittlerer Gewerbebetriebe
(Handwerk, Bau, Werkstatt, Gastro, Handel, Logistik). Primäre Situation:
unterwegs zwischen Lager, Baustelle und Werkstatt, kurze Sessions am Smartphone
zwischen zwei Aufgaben. Standard-Ergonomie ist ausreichend (bestätigt: keine
Sonderanforderungen für Handschuhe/Sonnenlicht).

Sekundär (nicht diese Surface): Marktplatz-Admins im Web-Backoffice.

## Product Purpose

B2B-Kleinanzeigen-Marktplatz — Firmen kaufen und verkaufen Maschinen, Material,
Fahrzeuge, Restposten und Dienstleistungen untereinander. Nur per App (iOS +
Android), keine öffentliche Website. Erfolg heißt: Inserate führen zu Anfragen
und Abschlüssen zwischen verifizierten Firmen; Inserieren und Anfragen sind in
Minuten erledigt.

## Positioning

„Hier handeln nur echte, geprüfte Firmen." Strenges KYB (USt-IdNr.,
Handelsregister, Nachweisdokumente, manuelle Freigabe) ist der Mechanismus, den
ein generischer Kleinanzeigen-Marktplatz nicht wahrheitsgemäß behaupten kann.
Die vertraute Kleinanzeigen-Mechanik (inserieren, suchen, merken, chatten,
Preis verhandeln) bleibt erhalten — nur eben ausschließlich B2B.

## Operating Context

- Firma registriert sich (Firma + Owner-Konto), reicht KYB ein, wartet auf
  manuelle Freigabe; erst danach darf sie inserieren und Verkäufer kontaktieren.
  Unverifizierte Firmen können suchen und stöbern.
- Kernschleife: stöbern/suchen → Inserat ansehen → merken oder anfragen →
  im Chat verhandeln (Text + strukturierte Preisvorschläge) → Übergabe/Versand
  bilateral klären.
- Inserenten verwalten ihre Anzeigen (pausieren, verkauft, löschen) und
  beantworten Anfragen; Push hält sie über Nachrichten und KYB-Status aktuell.
- Moderation (Meldungen, Entfernungen, Sperren) passiert im separaten
  Web-Backoffice; die App zeigt deren Folgen ehrlich an.

## Capabilities and Constraints

- Funktionsumfang MVP ist in `docs/ANFORDERUNGEN.md` (Repo-Root) mit IDs
  festgeschrieben; App-Screens: APP-1 … APP-10.
- Fünf Tabs: Entdecken, Merkliste, Einstellen (+), Nachrichten, Meins.
- Deutsch-only im MVP; Preise in EUR, B2B-üblich netto (Kennzeichen brutto/netto).
- Technik: Expo / React Native (bestehendes Monorepo `apps/mobile`), REST-API +
  WebSocket-Chat + Expo-Push vorhanden (`apps/api`).
- Einheitliche Marken-UI auf iOS und Android (bestätigt): eine Designsprache,
  keine per-OS-Gestaltung; nur Systemaffordanzen (Gesten, Safe Areas,
  Navigations-Konventionen) bleiben nativ.
- Verifizierungsstatus der Firma (UNVERIFIED / PENDING_REVIEW / VERIFIED /
  REJECTED / SUSPENDED) steuert, was die App erlaubt — Sperren und Ablehnungen
  müssen mit Begründung sichtbar sein.

## Brand Commitments

Arbeitstitel „B2BMarkt" — bewusst vorläufig (bestätigt: Name kommt später).
Design markenneutral-professionell halten; Name/Logo müssen später austauschbar
sein, ohne das Designsystem umzubauen. Keine Logos, keine Markenassets vorhanden.

**Gewählte Design-Richtung (bestätigt, Standing Preference):** Der
Kategorie-Standard, ehrlich und in voller Qualität ausgeführt — vertraute
Marktplatz-Konventionen nach dem Vorbild von Kleinanzeigen (weiße Cards,
runde Ecken, freundliches Grün als einzige Akzentfarbe, System-Schrift),
ohne Ironie und ohne eingeschmuggelte Eigenwilligkeiten. Verbindliche
Craft-Messlatte: die Kleinanzeigen-App. Eine bewusst gewählte, dem Wurf
vorgezogene Konvention — kein Versäumnis.

## Evidence on Hand

Keine echten Kundenlogos, Testimonials, Produktfotos oder Kennzahlen — nichts
davon erfinden. Vorhandene Demo-Daten (Seed): realistische deutsche
B2B-Inserate (Minibagger, Schweißgerät, Europaletten) mit Firmen „Stahlbau
Müller GmbH" / „Gastro Solutions UG" — nur für Entwicklung/Screens, nicht als
Social Proof ausgeben.

## Product Principles

1. **Vertrauen ist das Produkt.** Verifizierung ist überall funktional sichtbar
   (Badge, Firmenprofil, Gating), nie bloßes Schmuckelement.
2. **Vertraute Mechanik, keine Neuerfindung.** Wer Kleinanzeigen kennt, kann
   diese App sofort bedienen.
3. **Geschäftlich, nicht behördlich.** Professionell-nüchtern mit klarer
   Hierarchie — seriös ohne Amtsstuben-Kälte.
4. **Kurze Unterwegs-Sessions.** Jede Kernaufgabe (suchen, anfragen, antworten,
   inserieren) in wenigen Interaktionen abschließbar.
5. **Ehrliche Zustände.** KYB-Status, Wartezeiten, Ablehnungen, Moderation und
   Fehler werden klar und mit Begründung kommuniziert, nie kaschiert.
