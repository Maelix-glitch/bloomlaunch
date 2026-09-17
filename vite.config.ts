import { defineConfig } from 'vite';

/**
 * Bloom launch — Vite configuration.
 * - Binds 0.0.0.0 so the sandbox live preview can proxy it.
 * - `allowedHosts: true` lets the preview origin through Vite's host check.
 * - Build targets modern evergreen browsers; the experience degrades
 *   gracefully (static composition) where features are missing.
 */
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
  },
  preview: {
    // the live preview serves the BUILT bundle (one CSS + one JS file) —
    // far more robust through the sandbox proxy than the dev module graph
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
    cssMinify: true,
    reportCompressedSize: true,
  },
});
