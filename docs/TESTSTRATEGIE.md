# B2BMarkt — Teststrategie (TDD)

Entwicklung erfolgt testgetrieben: **Red → Green → Refactor.**
Für jede Anforderung aus `ANFORDERUNGEN.md` wird zuerst ein fehlschlagender Test
geschrieben (benannt mit der Anforderungs-ID), dann die minimale Implementierung,
dann Refactoring. Ein Feature gilt als fertig, wenn alle zugehörigen
Anforderungs-IDs durch grüne Tests abgedeckt sind.

## Test-Pyramide

| Ebene | Werkzeug | Was wird getestet | Anteil |
|---|---|---|---|
| Unit | Vitest | Reine Logik: Validierung (USt-Id), Statusmaschinen, Formatierung | schnell, viele |
| API-Integration | Vitest + `fastify.inject()` + echte PostgreSQL-Testdatenbank | Jede Route: Happy Path, AuthZ (401/403/404), Validierung (400), Konflikt (409) | **Kern der Suite** |
| Backoffice-UI | Vitest + React Testing Library (jsdom), API gemockt | Seitenlogik: Rendering nach Status, Aktionen feuern korrekte API-Calls | gezielt |
| App-UI | Jest (`jest-expo`) + React Native Testing Library | Screens: Auth-Weiche, Formular-Validierung, Listen-Rendering | gezielt |
| E2E | Stufe 2: Maestro (App) + Playwright (Backoffice) gegen Docker-Compose-Stack | Kritische Journeys: Registrieren → KYB → Freigabe → Inserieren → Chat | wenige |

## API-Integrationstests (wichtigste Ebene)

- Jeder Testlauf nutzt eine **eigene Test-Datenbank** (`b2bmarkt_test`), Migrationen
  werden vor der Suite angewendet (`prisma migrate deploy`), Tabellen zwischen
  Tests per `TRUNCATE … CASCADE` geleert — Tests sind unabhängig und deterministisch.
- Requests laufen über `app.inject()` (kein echter Port nötig), WebSocket-Tests
  über einen echten `listen()` auf Port 0.
- Push-Versand (Expo) wird im Test durch einen Fake ersetzt und nur auf
  „wurde mit richtigen Empfängern/Inhalten aufgerufen“ geprüft (PUSH-3: Fehler
  im Versand dürfen Requests nie scheitern lassen → eigener Test).
- Test-Factories (`createCompany({status})`, `createUser()`, `createListing()`)
  statt Fixtures — jeder Test baut sich genau die Welt, die er braucht.

### Namenskonvention

```ts
describe('POST /api/listings', () => {
  it('INS-1: lehnt unverifizierte Firmen mit 403 COMPANY_NOT_VERIFIED ab', …)
  it('INS-3: verlangt Preis, wenn nicht "auf Anfrage"', …)
})
```

Damit ist die Abdeckung pro Anforderung per `grep` nachweisbar:
`grep -rn "INS-1" apps/api/tests/` zeigt alle Tests zur Anforderung.

## Reihenfolge der TDD-Zyklen (MVP)

1. **AUTH** (AUTH-1 … AUTH-7) — Fundament, alles hängt daran
2. **KYB** (KYB-1 … KYB-7) + Admin-Freigabe (BO-1, BO-3, MOD-5)
3. **KAT** (KAT-1 … KAT-3)
4. **INS** (INS-1 … INS-8) inkl. Upload (NFA-4)
5. **SUCHE** (SUCHE-1 … SUCHE-4)
6. **FAV** (FAV-1, FAV-2)
7. **CHAT** (CHAT-1 … CHAT-7) inkl. WebSocket + PUSH-1 … PUSH-3
8. **MOD** (MOD-1 … MOD-5) + restliches Backoffice (BO-2, BO-4 … BO-6)
9. **App-Screens** (APP-1 … APP-8) — UI-Tests je Screen, gegen gemockte API
10. **NFA-Härtung** (NFA-1, NFA-2 quer über alles — Negativtests pro Route)

## Definition of Done (pro Feature)

- [ ] Tests zu allen betroffenen Anforderungs-IDs vorhanden und grün
- [ ] Negativfälle getestet (401/403/404/400/409, nicht nur Happy Path)
- [ ] `npm run typecheck` und `npm test` im Monorepo grün
- [ ] Keine Anforderung ohne Test, kein Test ohne Anforderungs-ID

## CI (NFA-9, Stufe 2)

GitHub Actions: Bei jedem Push `npm ci` → `typecheck` → `test` (mit
Postgres-Service-Container) → `build` (Backoffice) → `expo export` (App-Smoke).
