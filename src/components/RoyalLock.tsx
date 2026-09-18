import { motion } from "framer-motion";

/**
 * The royal seal — an ancient lock drawn in engraved gold.
 *
 * Stroke-only, like something pressed into a wax seal or etched on a vault
 * door: a crowned body, filigree corners, a rosette around the keyhole, and
 * a shackle that swings open the moment the countdown dies. The light of the
 * reveal is born in the keyhole.
 */
export function RoyalLock({
  open = false,
  glow = 0.4,
  className = "",
}: {
  /** Swing the shackle — the moment of unsealing. */
  open?: boolean;
  /** 0 → 1: the inner light behind the keyhole. */
  glow?: number;
  className?: string;
}) {
  const gold = "#e8b158";
  const pale = "#f3e6c9";

  return (
    <svg
      viewBox="0 0 200 250"
      className={className}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 ${18 + glow * 30}px rgba(232,177,88,${0.12 + glow * 0.35}))` }}
    >
      {/* The shackle — swings about its left leg when the seal breaks */}
      <motion.g
        initial={false}
        animate={open ? { rotate: -34, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 1.05, ease: [0.3, 0.9, 0.25, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "8% 100%" }}
      >
        <path
          d="M 62 92 V 66 A 38 38 0 0 1 138 66 V 92"
          fill="none"
          stroke={gold}
          strokeWidth="9"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Engraved line along the shackle */}
        <path
          d="M 68 92 V 66 A 32 32 0 0 1 132 66 V 92"
          fill="none"
          stroke={gold}
          strokeWidth="1.2"
          opacity="0.5"
        />
        {/* Collars where the shackle meets the body */}
        <rect x="55" y="86" width="14" height="7" rx="2" fill="none" stroke={gold} strokeWidth="1.6" opacity="0.8" />
        <rect x="131" y="86" width="14" height="7" rx="2" fill="none" stroke={gold} strokeWidth="1.6" opacity="0.8" />
      </motion.g>

      {/* The body: an engraved shield */}
      <rect x="38" y="92" width="124" height="118" rx="16" fill="rgba(232,177,88,0.028)" stroke={gold} strokeWidth="2.4" opacity="0.95" />
      <rect x="46" y="100" width="108" height="102" rx="11" fill="none" stroke={gold} strokeWidth="1" opacity="0.45" />

      {/* The crown, engraved on the face */}
      <g stroke={gold} strokeWidth="1.8" fill="none" opacity="0.85" strokeLinejoin="round" strokeLinecap="round">
        <path d="M 82 118 L 86.5 107.5 L 93.5 116 L 100 105 L 106.5 116 L 113.5 107.5 L 118 118 Z" />
        <path d="M 82 122 H 118" strokeWidth="1.2" opacity="0.7" />
        <circle cx="86.5" cy="105.5" r="1.3" fill={gold} />
        <circle cx="100" cy="103" r="1.3" fill={gold} />
        <circle cx="113.5" cy="105.5" r="1.3" fill={gold} />
      </g>

      {/* The keyhole with its rosette — the heart of the seal */}
      <circle cx="100" cy="152" r="19" fill="none" stroke={gold} strokeWidth="1" opacity="0.5" strokeDasharray="2.6 3.4" />
      <circle cx="100" cy="152" r="10.5" fill="none" stroke={gold} strokeWidth="1.8" opacity="0.9" />
      <path d="M 95.4 159 L 90.5 178 L 109.5 178 L 104.6 159 Z" fill="none" stroke={gold} strokeWidth="1.8" strokeLinejoin="round" opacity="0.9" />
      {/* The inner light, waking as the end approaches */}
      <circle cx="100" cy="152" r="6.5" fill={pale} opacity={0.08 + glow * 0.85} style={{ filter: `blur(${2 + glow * 5}px)` }} />

      {/* Filigree corners */}
      <g stroke={gold} strokeWidth="1.1" fill="none" opacity="0.55" strokeLinecap="round">
        <path d="M 54 108 q 0 -8 8 -8" />
        <path d="M 146 108 q 0 -8 -8 -8" />
        <path d="M 54 194 q 0 8 8 8" />
        <path d="M 146 194 q 0 8 -8 8" />
        <path d="M 60 152 q -6 0 -6 -6" />
        <path d="M 140 152 q 6 0 6 -6" />
      </g>

      {/* The foot ornament */}
      <g stroke={gold} strokeWidth="1.3" fill="none" opacity="0.7">
        <path d="M 88 190 H 112" opacity="0.6" />
        <path d="M 100 186 L 104 190 L 100 194 L 96 190 Z" />
      </g>

      {/* Side studs, like rivets on a vault door */}
      <circle cx="56" cy="130" r="2.2" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
      <circle cx="144" cy="130" r="2.2" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
      <circle cx="56" cy="174" r="2.2" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
      <circle cx="144" cy="174" r="2.2" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}
