# B2BMarkt

B2B-Kleinanzeigen-Marktplatz — **nur für verifizierte Firmen**, nur App + Backoffice
(keine öffentliche Website). Monorepo:

| Pfad | Was | Stack |
|---|---|---|
| `apps/api` | REST-API + WebSocket-Chat + Push | Fastify 5, Prisma, PostgreSQL |
| `apps/backoffice` | Admin-Web-UI (KYB-Freigaben, Moderation) | React 19, Vite |
| `apps/mobile` | iOS/Android-App | Expo SDK 53, expo-router |
| `docs/` | Anforderungskatalog, Teststrategie, UI-Brief | — |

## Schnellstart mit Docker (empfohlen)

Der komplette Stack läuft in Containern, **der Code ist per Bind-Mount
eingehängt** — Änderungen am Quelltext laden überall automatisch neu.

```bash
docker compose up          # DB + API (Port 4000) + Backoffice (Port 5173)
```

Beim ersten Start installiert der `deps`-Service die Abhängigkeiten in
Named Volumes und die API migriert + seedet die Datenbank. Danach:

- Backoffice: http://localhost:5173 — Login `admin@b2bmarkt.dev` / `demo1234`
- API-Health: http://localhost:4000/api/health
- Demo-Firmen (App-Login): `einkauf@stahlbau-mueller.dev` (verifiziert),
  `info@gastro-solutions.dev` (KYB in Prüfung) — Passwort `demo1234`

Nach Änderungen an `package.json`: `docker compose run --rm deps`

### Mobile App im Container (optional)

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=<deine-LAN-IP> \
EXPO_PUBLIC_API_URL=http://<deine-LAN-IP>:4000 \
docker compose --profile mobile up
```

Dann den QR-Code aus den Container-Logs mit Expo Go scannen. Das Handy muss
Host-IP:8081 (Metro) und Host-IP:4000 (API) erreichen. Alternativ läuft
Expo auch außerhalb von Docker: `npm run dev:mobile`.

## Entwicklung ohne Docker

Voraussetzungen: Node ≥ 20, PostgreSQL 16 (`createdb b2bmarkt`, Nutzer `b2b`/`b2b`).

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run -w apps/api prisma:migrate && npm run -w apps/api seed
npm run dev:api          # Port 4000
npm run dev:backoffice   # Port 5173
npm run dev:mobile       # Expo
```

## Tests

Entwicklung ist testgetrieben (`docs/TESTSTRATEGIE.md`); Tests referenzieren
Anforderungs-IDs aus `docs/ANFORDERUNGEN.md`.

```bash
npm test                              # alle Workspaces
npm run -w apps/api test:coverage     # API: 104 Tests, Thresholds 98/98/98/92
npm run -w apps/mobile test:coverage  # Mobile-Logik: 100 % Coverage
npm run -w apps/mobile test:ui        # Snapshot-Tests (jest-expo)
npm run typecheck                     # tsc in allen Workspaces
```

Die API-Integrationstests brauchen eine Test-DB `b2bmarkt_test`
(läuft die Docker-DB, reicht: `docker compose exec db createdb -U b2b b2bmarkt_test`).

## Architektur-Notizen

- **Strenges KYB:** Firmen starten `UNVERIFIED`; inserieren/kontaktieren erst
  nach manueller Freigabe im Backoffice (USt-IdNr. + Nachweisdokumente).
- **Chat:** eine Unterhaltung pro (Inserat, Käufer-Firma); Preisvorschläge als
  strukturierte Nachrichten mit Statusmaschine; Echtzeit via WebSocket
  (`/ws?token=…`), Push via Expo.
- **Uploads:** lokale Platte (`apps/api/uploads`), für Produktion gegen
  S3-kompatiblen Storage tauschbar (nur `src/routes/uploads.ts` betroffen).
- **Design:** `docs/UI-BRIEF-MOBILE.md` (bestätigt) — Kleinanzeigen-Standard
  in voller Qualität; Produktwahrheit in `apps/mobile/PRODUCT.md`.
