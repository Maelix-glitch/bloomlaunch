/* ============================================================
   BLOOM · MARK LOADER
   The supplied production logo (public/logo/bloom-mark.svg or
   .png) is the exact brand asset and is used wherever the mark
   appears. Until it is supplied, a clearly-provisional bloom
   glyph holds the composition — it is never presented as the
   finished logo (see ASSETS.md).
   ============================================================ */

/** Provisional glyph: five-petal bloom. Replaced wholesale when
 *  the real asset exists. Kept deliberately simple so the swap
 *  is unambiguous in QA. */
const PROVISIONAL_MARK = `
<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
  <g fill="currentColor">
    <ellipse cx="32" cy="16.5" rx="8" ry="12.5"/>
    <ellipse cx="32" cy="16.5" rx="8" ry="12.5" transform="rotate(72 32 32)"/>
    <ellipse cx="32" cy="16.5" rx="8" ry="12.5" transform="rotate(144 32 32)"/>
    <ellipse cx="32" cy="16.5" rx="8" ry="12.5" transform="rotate(216 32 32)"/>
    <ellipse cx="32" cy="16.5" rx="8" ry="12.5" transform="rotate(288 32 32)"/>
  </g>
  <circle cx="32" cy="32" r="6.5" fill="#e3c37f"/>
</svg>`;

const LOGO_PATHS = ['/logo/bloom-mark.svg', '/logo/bloom-mark.png'];

const assetExists = async (url: string): Promise<boolean> => {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
    return res.ok;
  } catch {
    return false;
  }
};

/** Inject the mark into every slot. Resolves to true when the real asset was found. */
export async function loadMark(): Promise<boolean> {
  const slots = Array.from(document.querySelectorAll<HTMLElement>('[data-mark-slot]'));
  if (slots.length === 0) return false;

  const svgPath = LOGO_PATHS[0];
  const pngPath = LOGO_PATHS[1];

  if (svgPath && (await assetExists(svgPath))) {
    const markup = await (await fetch(svgPath, { cache: 'force-cache' })).text();
    for (const slot of slots) slot.innerHTML = markup;
    updateFavicon(svgPath);
    return true;
  }

  if (pngPath && (await assetExists(pngPath))) {
    for (const slot of slots) {
      slot.innerHTML = `<img src="${pngPath}" alt="" width="64" height="64" style="width:100%;height:100%;object-fit:contain" />`;
    }
    updateFavicon(pngPath);
    return true;
  }

  // Provisional stand-in — flagged so QA can spot it at a glance.
  for (const slot of slots) {
    slot.dataset.provisional = 'true';
    slot.innerHTML = PROVISIONAL_MARK;
  }
  return false;
}

const updateFavicon = (href: string): void => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = href;
};
