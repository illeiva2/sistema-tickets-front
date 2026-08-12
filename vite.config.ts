import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // PWA instalable + service worker propio (push). injectManifest para
    // controlar el SW a mano: precache de assets pero navegación siempre
    // por red (evita servir un index.html viejo tras cada deploy).
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Soporte GRF",
        short_name: "Soporte GRF",
        description:
          "Mesa de ayuda interna de GRF: tickets de soporte, recursos y gestión IT.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0f1115",
        theme_color: "#6c53cf",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["all", ".nip.io"], // Permite dominios personalizados o IPs nip.io
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Splittear solo libs grandes que NO tienen deps circulares con React.
        // Importante: NO partir react/react-router/react-query a chunks distintos,
        // porque se rompe el orden de inicializacion (React.createContext is undefined).
        // recharts, react-markdown y @dnd-kit son seguros porque son consumidores
        // puros (no se evaluan al cargar la app, solo cuando se montan sus
        // componentes en lazy chunks).
        manualChunks: {
          "vendor-charts": ["recharts"],
          "vendor-markdown": ["react-markdown", "remark-gfm"],
          "vendor-dnd": ["@dnd-kit/core"],
        },
      },
    },
  },
});
