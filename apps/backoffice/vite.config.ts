import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Im Docker-Dev-Stack zeigt der Proxy auf den API-Container (http://api:4000),
// lokal ohne Docker auf localhost.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
});
