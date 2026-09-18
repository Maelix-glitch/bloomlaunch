/**
 * Odometer arithmetic.
 *
 * A digit is a column of cells inside a fixed-height window; showing a value
 * means translating that column by exactly one cell per unit. Kept pure so the
 * alignment can be verified, because "the number is showing one off" is the
 * kind of bug that is invisible in code review and glaring on screen.
 */

/** The digits a single cell column can display. */
export const DIGIT_COUNT = 10;

/** 0-9 with a trailing 0, so 9 → 0 rolls forward like a mechanical counter. */
export const CELLS = [...Array(DIGIT_COUNT).keys(), 0] as const;

/**
 * Eleven cells for ten digits: the extra cell duplicates the first so the
 * carry from 9 back to 0 continues forward instead of rewinding the column.
 */
export const CELL_COUNT = CELLS.length;

/** How tall one cell is, as a multiple of the font size. */
export const CELL_HEIGHT_EM = 1.14;

/** One cell, as a percentage of the whole column. */
export function cellShare(digitCount: number = DIGIT_COUNT): number {
  return 100 / Math.max(digitCount + 1, 1);
}

/**
 * The translateY, in percent of the column, that brings `value` into the
 * window. Negative because the column moves up.
 *
 * Values clamp to the real digits (0-9), never to the trailing wrap cell —
 * clamping to the wrap cell would silently render an out-of-range value as 0.
 */
export function cellOffsetPercent(value: number, digitCount: number = DIGIT_COUNT): number {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  const clamped = Math.max(0, Math.min(digitCount - 1, rounded));
  return -(clamped * cellShare(digitCount));
}

/**
 * The same offset as a fraction 0 → 1 of the column's travel, for a
 * continuously driven wheel. One full traversal is one seamless revolution.
 */
export function wheelOffsetPercent(fraction: number): number {
  const safe = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
  return -(safe * 100);
}

/** Which cell is actually visible for a given offset — used to verify alignment. */
export function visibleCell(offsetPercent: number, digitCount: number = DIGIT_COUNT): number {
  const cells = Math.max(digitCount + 1, 1);
  const travelled = (-offsetPercent / 100) * cells;
  return Math.max(0, Math.min(cells - 1, Math.round(travelled)));
}
