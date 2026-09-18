import { useCountdown } from "../hooks/useCountdown";
import { formatClock } from "../lib/countdown";

/**
 * The countdown, carried through the rest of the site.
 *
 * The full piece lives in #launch; this is the small live reminder that keeps
 * the launch present everywhere else. Same hook, same clock, same numbers —
 * the site never shows two different readings of the same moment.
 */
export function CountdownLine({
  label = "Bloom opens in",
  variant = "plain",
  className = "",
  href = "#launch",
}: {
  label?: string;
  variant?: "plain" | "pill";
  className?: string;
  href?: string;
}) {
  const { remaining, live, window: launchWindow } = useCountdown({ precision: "seconds" });
  const imminent = !live && remaining.total <= 60 * 60 * 1000;
  const clock = formatClock(remaining.total);

  const pill =
    "inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm transition-colors hover:border-white/25";

  return (
    <a
      href={href}
      data-cursor="hover"
      className={`${variant === "pill" ? pill : "inline-flex items-center gap-2.5"} group ${className}`}
      aria-label={
        live
          ? "Bloom is live — go to the launch"
          : `${clock} until Bloom launches — go to the countdown`
      }
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          live
            ? "bg-[#7fb88f] shadow-[0_0_12px_rgba(127,184,143,0.95)]"
            : imminent
              ? "animate-ping bg-[#e8b158] shadow-[0_0_12px_rgba(232,177,88,0.95)]"
              : "bg-[#e8b158] shadow-[0_0_10px_rgba(232,177,88,0.8)]"
        }`}
      />
      <span className="text-[0.62rem] uppercase tracking-[0.22em] text-white/45">{label}</span>
      <span
        aria-hidden="true"
        className={`font-mono text-[0.78rem] tabular-nums tracking-[0.08em] ${
          live ? "text-[#7fb88f]" : "text-white/85"
        }`}
      >
        {live ? "Live now" : clock}
      </span>
      {launchWindow.rolling && !live && (
        <span className="text-[0.58rem] uppercase tracking-[0.16em] text-white/25">window</span>
      )}
    </a>
  );
}
