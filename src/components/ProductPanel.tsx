import { useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { PanelFrame, type GlowKey } from "./PanelFrame";
import { shotUrl } from "../lib/assets";
import { useReducedMotion } from "../hooks/useReducedMotion";

type ProductPanelProps = {
  /** file name inside /public/shots, e.g. "hero-03-mood" */
  shot: string;
  alt: string;
  url?: string;
  glow?: GlowKey;
  /** small floating caption pinned to the panel's lower edge */
  badge?: string;
  /** value shown in the badge, e.g. "8/10" */
  badgeValue?: string;
  className?: string;
  maxTilt?: number;
};

/**
 * A real Bloom screen presented in 3D.
 *
 * Two independent motions are layered: a scroll-linked parallax (the panel
 * rotates and drifts as it travels through the viewport) and the pointer
 * tilt from PanelFrame. The capture itself is the untouched product UI —
 * nothing is redrawn or faked.
 */
export function ProductPanel({
  shot,
  alt,
  url = "bloom.app",
  glow = "gold",
  badge,
  badgeValue,
  className = "",
  maxTilt = 6,
}: ProductPanelProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.5 });

  const y = useTransform(p, [0, 1], [38, -38]);
  const rotateY = useTransform(p, [0, 0.5, 1], [6.5, 0, -6.5]);
  const rotateX = useTransform(p, [0, 0.5, 1], [3.5, 0, -2.5]);
  const scale = useTransform(p, [0, 0.5, 1], [0.965, 1, 0.985]);
  const badgeY = useTransform(p, [0, 0.5, 1], [22, 0, -18]);

  const parallax = reduced ? undefined : { y, rotateY, rotateX, scale };

  return (
    <div ref={ref} className={`relative ${className}`} style={{ perspective: 1500 }}>
      <motion.div style={parallax} className="relative" >
        <PanelFrame glow={glow} url={url} maxTilt={maxTilt}>
          <div className="relative bg-[#06070a]">
            {/* Placeholder keeps the layout stable until the capture decodes */}
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,#0b0d12,#06070a)] transition-opacity duration-700"
              style={{ opacity: loaded ? 0 : 1 }}
            />
            <picture>
              <source srcSet={shotUrl(shot, "avif")} type="image/avif" />
              <source srcSet={shotUrl(shot, "webp")} type="image/webp" />
              <img
                loading="lazy"
                decoding="async"
                src={shotUrl(shot, "webp")}
                alt={alt}
                width={2200}
                height={1375}
                onLoad={() => setLoaded(true)}
                className="block h-auto w-full transition-opacity duration-700"
                style={{ opacity: loaded ? 1 : 0 }}
              />
            </picture>
          </div>
        </PanelFrame>

        {badge && (
          <motion.div
            style={reduced ? undefined : { y: badgeY }}
            className="pointer-events-none absolute -bottom-5 left-6 z-20 flex items-center gap-3 rounded-full border border-white/10 bg-black/75 px-4 py-2.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:left-10"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#e8b158] shadow-[0_0_10px_rgba(232,177,88,0.9)]" />
            <span className="text-[0.68rem] uppercase tracking-[0.22em] text-white/45">{badge}</span>
            {badgeValue && (
              <span className="font-display text-[0.95rem] leading-none text-[#f3e6c9]">{badgeValue}</span>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
