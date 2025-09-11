import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'

// Build-Guard: PLAIN im Prod-Build verbieten
if (process.env.NODE_ENV === 'production' && process.env.VITE_ENCRYPTION_MODE === 'plain') {
  throw new Error(
    '❌ PLAIN-Modus im Production-Build verboten!\n' +
    'Setzen Sie VITE_ENCRYPTION_MODE=prod-enc in .env.production oder als CI-Variable.\n' +
    'Für Development verwenden Sie dev-enc (siehe .env.development).\n' +
    'Beispiel: VITE_ENCRYPTION_MODE=prod-enc npm run build'
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({ registerType: 'autoUpdate', workbox: { navigateFallback: '/index.html' } }),react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});