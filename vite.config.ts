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
    // Limite del warning subido un poco para evitar ruido falso. El verdadero
    // control viene del manualChunks que parte vendor libs en pedazos.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Splittear vendor libs en chunks separados para que se cacheen
        // independientemente y solo se descarguen cuando hacen falta.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("react-markdown") || id.includes("remark-") || id.includes("micromark") || id.includes("mdast")) return "vendor-markdown";
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-dom")) return "vendor-react";
          if (id.includes("/react/") || id.includes("\\react\\")) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
});
