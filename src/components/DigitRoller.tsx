import { motion } from "framer-motion";
import { CELLS, CELL_HEIGHT_EM, cellOffsetPercent, wheelOffsetPercent } from "../lib/odometer";

/**
 * Cell height as a CSS length. Slightly taller than 1em so a font with generous
 * ascenders or descenders is never clipped by the overflow window — at 10.5rem
 * a clipped numeral would be very obvious.
 */
const CELL_HEIGHT = `${CELL_HEIGHT_EM}em`;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One odometer digit.
 *
 * The column holds eleven cells and is translated by exactly one cell per
 * increment, so a carry rolls the way a mechanical counter does. Each digit
 * gets its own fixed-width box, which kills the width jitter that proportional
 * numerals would otherwise cause as the value changes.
 */
export function Digit({ value, className = "", duration = 0.55 }: { value: number; className?: string; duration?: number }) {
  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{ height: CELL_HEIGHT, width: "0.62em" }}
      aria-hidden="true"
    >
      <motion.span
        className="flex flex-col items-center"
        style={{ lineHeight: 1 }}
        animate={{ y: `${cellOffsetPercent(value)}%` }}
        transition={{ duration, ease: EASE }}
      >
        {CELLS.map((cell, i) => (
          <span key={i} className="flex items-center justify-center" style={{ height: CELL_HEIGHT, lineHeight: 1 }}>
            {cell}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * The fast wheel.
 *
 * `fraction` runs 0 → 1 across a single second and drives the column directly,
 * with no transition — so it turns continuously, exactly one revolution per
 * second, and wraps seamlessly between the trailing 0 and the leading 0. This
 * is the detail that makes a countdown feel alive rather than sampled.
 */
export function RollWheel({ fraction, className = "" }: { fraction: number; className?: string }) {
  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{ height: CELL_HEIGHT, width: "0.58em" }}
      aria-hidden="true"
    >
      <span
        className="flex flex-col items-center will-change-transform"
        style={{ lineHeight: 1, transform: `translate3d(0, ${wheelOffsetPercent(fraction).toFixed(4)}%, 0)` }}
      >
        {CELLS.map((cell, i) => (
          <span key={i} className="flex items-center justify-center" style={{ height: CELL_HEIGHT, lineHeight: 1 }}>
            {cell}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * A two-digit odometer group with a screen-readable value for assistive tech,
 * which cannot see a column of animating digits.
 */
export function DigitPair({
  digits,
  className = "",
  duration,
}: {
  digits: [number, number];
  className?: string;
  duration?: number;
}) {
  return (
    <span className={`inline-flex ${className}`}>
      <Digit value={digits[0]} duration={duration} />
      <Digit value={digits[1]} duration={duration} />
    </span>
  );
}
