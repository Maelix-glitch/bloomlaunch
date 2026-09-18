/** Single source of truth for public asset URLs (respects Vite's base). */
export const BASE_URL = import.meta.env.BASE_URL || "/";

/** Real Bloom interface captures, served from /public/shots. */
export function shotUrl(name: string, format: "avif" | "webp"): string {
  return `${BASE_URL}shots/${name}.${format}`;
}
