// Läuft vor jedem Test-File (vitest setupFiles): Test-DB erzwingen,
// bevor irgendein src-Modul dotenv/config lädt.
process.env.DATABASE_URL = 'postgresql://b2b:b2b@localhost:5432/b2bmarkt_test?schema=public';
process.env.JWT_SECRET = 'test-secret';
process.env.PUBLIC_BASE_URL = 'http://localhost:4000';
