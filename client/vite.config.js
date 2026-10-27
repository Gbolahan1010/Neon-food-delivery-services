import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development every /api request is forwarded to the API, so the browser sees a
// single origin and the login cookie just works. By default that is the live API on Render;
// set API_PROXY_TARGET=http://localhost:5000 to use an API running on your own machine.
const apiTarget = process.env.API_PROXY_TARGET || 'https://neon-food-delivery-services.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // GitHub Codespaces opens the app on a *.app.github.dev address
    allowedHosts: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true, secure: true },
    },
  },
});
