import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
