import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ command }) => ({
  // Only enable self-signed SSL during local dev (`npm run dev`) for mobile camera testing
  plugins: [react(), ...(command === "serve" ? [basicSsl()] : [])],
  server: {
    host: true,
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 600,
    // Prevent heavy lazy-loaded chunks (Charts & Barcode Scanner) from preloading on the customer homepage
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes("vendor-charts") &&
            !dep.includes("vendor-scanner") &&
            !dep.includes("AdminDashboard"),
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // 1. Check specific libraries FIRST before generic "react" checks
          if (id.includes("html5-qrcode")) {
            return "vendor-scanner";
          }
          if (
            id.includes("recharts") ||
            id.includes("d3-") ||
            id.includes("victory-vendor") ||
            id.includes("react-smooth") ||
            id.includes("reselect") ||
            id.includes("@reduxjs/toolkit")
          ) {
            return "vendor-charts";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("react-icons")) {
            return "vendor-icons";
          }
          // 2. Match exact React core & router packages using path slashes
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("i18next")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
}));
