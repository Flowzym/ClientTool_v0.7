// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
if (process.env.NODE_ENV === "production" && process.env.VITE_ENCRYPTION_MODE === "plain") {
  throw new Error(
    "\u274C PLAIN-Modus im Production-Build verboten!\nSetzen Sie VITE_ENCRYPTION_MODE=prod-enc in .env.production oder als CI-Variable.\nF\xFCr Development verwenden Sie dev-enc (siehe .env.development).\nBeispiel: VITE_ENCRYPTION_MODE=prod-enc npm run build"
  );
}
var vite_config_default = defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      workbox: { navigateFallback: "/index.html" },
      manifest: {
        name: "Klienten\u2011Listenapp",
        short_name: "Klienten",
        description: "Lokale Klient:innen-Listenapp \u2013 offline\u2011first, verschl\xFCsselte Daten (AES\u2011GCM/Argon2id).",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    }),
    react()
  ],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: []
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuXG4vLyBCdWlsZC1HdWFyZDogUExBSU4gaW0gUHJvZC1CdWlsZCB2ZXJiaWV0ZW5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nICYmIHByb2Nlc3MuZW52LlZJVEVfRU5DUllQVElPTl9NT0RFID09PSAncGxhaW4nKSB7XG4gIHRocm93IG5ldyBFcnJvcihcbiAgICAnXHUyNzRDIFBMQUlOLU1vZHVzIGltIFByb2R1Y3Rpb24tQnVpbGQgdmVyYm90ZW4hXFxuJyArXG4gICAgJ1NldHplbiBTaWUgVklURV9FTkNSWVBUSU9OX01PREU9cHJvZC1lbmMgaW4gLmVudi5wcm9kdWN0aW9uIG9kZXIgYWxzIENJLVZhcmlhYmxlLlxcbicgK1xuICAgICdGXHUwMEZDciBEZXZlbG9wbWVudCB2ZXJ3ZW5kZW4gU2llIGRldi1lbmMgKHNpZWhlIC5lbnYuZGV2ZWxvcG1lbnQpLlxcbicgK1xuICAgICdCZWlzcGllbDogVklURV9FTkNSWVBUSU9OX01PREU9cHJvZC1lbmMgbnBtIHJ1biBidWlsZCdcbiAgKTtcbn1cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgd29ya2JveDogeyBuYXZpZ2F0ZUZhbGxiYWNrOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnS2xpZW50ZW5cdTIwMTFMaXN0ZW5hcHAnLFxuICAgICAgICBzaG9ydF9uYW1lOiAnS2xpZW50ZW4nLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0xva2FsZSBLbGllbnQ6aW5uZW4tTGlzdGVuYXBwIFx1MjAxMyBvZmZsaW5lXHUyMDExZmlyc3QsIHZlcnNjaGxcdTAwRkNzc2VsdGUgRGF0ZW4gKEFFU1x1MjAxMUdDTS9BcmdvbjJpZCkuJyxcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjMTExODI3JyxcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyMxMTE4MjcnLFxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tMTkyLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAnL2ljb25zL2ljb24tNTEyLnBuZycsXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pLFxuICAgIHJlYWN0KClcbiAgXSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgc2V0dXBGaWxlczogW11cbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBR3hCLElBQUksUUFBUSxJQUFJLGFBQWEsZ0JBQWdCLFFBQVEsSUFBSSx5QkFBeUIsU0FBUztBQUN6RixRQUFNLElBQUk7QUFBQSxJQUNSO0FBQUEsRUFJRjtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsU0FBUyxFQUFFLGtCQUFrQixjQUFjO0FBQUEsTUFDM0MsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFNBQVM7QUFBQSxJQUNULFlBQVksQ0FBQztBQUFBLEVBQ2Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
