import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
  server: {
    fs: {
      allow: [".."],
    },
    // Only enable COOP/COEP headers in local dev, not in Codespaces
    // These headers enable SharedArrayBuffer for SQLite WASM but can break Codespaces
    headers: process.env.CODESPACES
      ? {}
      : {
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin",
        },
  },
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"],
  },
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es",
  },
});
