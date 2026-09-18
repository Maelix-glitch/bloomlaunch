interface LogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
  strokeWidth?: number;
}

/**
 * The Bloom mark — the ascending arch.
 *
 * Traced from the real brand asset: a single rounded arch with round caps,
 * a deep green left leg lifting into a warm cream apex and settling into a
 * deeper gold right leg, on a near-black tile. The gradient runs horizontally
 * so the apex lands on cream exactly as it does in the product.
 */
export function BloomGlyph({ size = 40, className = "", glow = false, strokeWidth = 9 }: LogoProps) {
  const id = `bloom-arch-${Math.round(size * 100)}-${strokeWidth}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={glow ? { filter: "drop-shadow(0 0 18px rgba(232,177,88,0.4))" } : undefined}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="16" y1="72" x2="84" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7fb88f" />
          <stop offset="0.5" stopColor="#efe3c0" />
          <stop offset="1" stopColor="#e8b158" />
        </linearGradient>
      </defs>
      <path
        d="M18 77 C 18 41.5 32.2 23 50 23 C 67.8 23 82 41.5 82 77"
        stroke={`url(#${id})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** The mark in its app-icon tile, as it appears on device. */
export function BloomMark({ size = 44, className = "" }: LogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[26%] bg-[#0b0c10] ring-1 ring-white/10 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_110%,rgba(232,177,88,0.14),transparent_70%)]" />
      <BloomGlyph size={size * 0.66} strokeWidth={size * 0.1} />
    </div>
  );
}

export function BloomWordmark({ className = "", size = 26 }: { className?: string; size?: number }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <BloomGlyph size={size} strokeWidth={size * 0.24} />
      <span className="font-display text-[1.25rem] tracking-tight text-white">Bloom</span>
    </div>
  );
}
