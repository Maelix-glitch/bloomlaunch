import type { ReactNode } from "react";
import { Eyebrow, Reveal } from "./Reveal";
import { ProductPanel } from "./ProductPanel";
import type { GlowKey } from "./PanelFrame";

type StorySectionProps = {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  insightLabel: string;
  insight: string;
  side?: "left" | "right";
  glow?: GlowKey;
  bg?: string;
  /** chapter number, e.g. "01" */
  step?: string;
  /** real Bloom capture to present (file name inside /public/shots) */
  shot?: string;
  /** alt text for the capture */
  shotAlt?: string;
  /** in-app route shown in the browser chrome */
  route?: string;
  badge?: string;
  badgeValue?: string;
  children?: ReactNode;
};

const EYEBROW_TINT: Record<GlowKey, string> = {
  gold: "from-[#7fb88f] to-[#e8b158]",
  violet: "from-[#8d7bf2] to-[#e8b158]",
  pink: "from-[#e191b3] to-[#8d7bf2]",
  green: "from-[#7fb88f] to-[#c9a6f2]",
  blue: "from-[#5b8ff2] to-[#7fb88f]",
};

/**
 * The repeating story unit: a written chapter on one side, the real product
 * on the other, drifting through 3D space as you scroll.
 */
export function StorySection({
  id,
  eyebrow,
  title,
  description,
  insightLabel,
  insight,
  side = "right",
  glow = "gold",
  bg,
  step,
  shot,
  shotAlt,
  route = "bloom.app",
  badge,
  badgeValue,
  children,
}: StorySectionProps) {
  const copy = (
    <Reveal className="max-w-md" y={22}>
      <div className="flex items-center gap-4">
        {step && (
          <span className="font-display text-[0.9rem] text-white/25 tabular-nums">{step}</span>
        )}
        <Eyebrow accent={EYEBROW_TINT[glow]}>{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-5 font-display text-[2.1rem] leading-[1.12] text-white sm:text-[2.6rem]">{title}</h2>
      <p className="mt-5 text-[0.98rem] leading-relaxed text-white/55">{description}</p>
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/35">{insightLabel}</p>
        <p className="mt-2 text-[0.92rem] text-white/70">{insight}</p>
      </div>
    </Reveal>
  );

  const visual = shot ? (
    <ProductPanel
      shot={shot}
      alt={shotAlt ?? `${eyebrow} inside the Bloom app`}
      url={route}
      glow={glow}
      badge={badge}
      badgeValue={badgeValue}
      className="w-full"
    />
  ) : (
    children
  );

  return (
    <section
      id={id}
      className="relative overflow-hidden py-28 sm:py-36"
      style={{ background: bg ?? "#050506" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(45% 40% at ${side === "right" ? "78%" : "22%"} 45%, rgba(255,255,255,0.022), transparent 70%)`,
        }}
      />
      <div className="relative mx-auto grid max-w-[1300px] items-center gap-16 px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-10">
        {side === "right" ? (
          <>
            {copy}
            <div>{visual}</div>
          </>
        ) : (
          <>
            <div className="lg:order-2">{copy}</div>
            <div className="lg:order-1">{visual}</div>
          </>
        )}
      </div>
    </section>
  );
}
