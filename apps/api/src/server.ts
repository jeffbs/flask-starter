import { buildApp } from './app.js';
import { config } from './config.js';
import { expireOverdueListings } from './lib/expiry.js';

const app = await buildApp();

// INS-5: überfällige Inserate stündlich auf EXPIRED setzen
setInterval(() => {
  expireOverdueListings().catch((err) => app.log.error(err, 'Expiry-Sweep fehlgeschlagen'));
}, 60 * 60 * 1000);

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
