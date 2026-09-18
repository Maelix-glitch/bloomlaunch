import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    // Hosted previews are proxied through *.e2b.app — allow them (and any
    // tunnel host) so the dev server is reachable from the browser preview.
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    // The 192-frame sequence and product captures stay as files in /public;
    // JS and CSS are inlined into index.html by vite-plugin-singlefile.
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
});
