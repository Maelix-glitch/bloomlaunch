/**
 * Fuzzy matching for the command palette.
 *
 * Deliberately small and dependency-free: a subsequence matcher with bonuses
 * for consecutive runs and word starts, which is what makes typing "dsh" find
 * "Dashboard" and "cc" find "Coach" feel obvious rather than lucky.
 */

export type Match = {
  score: number;
  /** indices in the haystack that matched, for highlighting */
  positions: number[];
};

const CONSECUTIVE_BONUS = 12;
const WORD_START_BONUS = 9;
const FIRST_CHAR_BONUS = 6;
const GAP_PENALTY = 1.2;

/**
 * Scores `query` against `text`. Returns null when the query is not a
 * subsequence of the text (i.e. genuinely no match).
 */
export function fuzzyMatch(query: string, text: string): Match | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return { score: 0, positions: [] };

  const haystack = text.toLowerCase();
  if (needle.length > haystack.length) return null;

  const positions: number[] = [];
  let score = 0;
  let cursor = 0;
  let previous = -2;

  for (let i = 0; i < needle.length; i += 1) {
    const char = needle[i];
    const found = haystack.indexOf(char, cursor);
    if (found === -1) return null;

    if (found === previous + 1) score += CONSECUTIVE_BONUS;
    if (found === 0) score += FIRST_CHAR_BONUS;
    else if (/[\s\-_/·]/.test(haystack[found - 1])) score += WORD_START_BONUS;

    if (previous >= 0 && found > previous + 1) score -= (found - previous - 1) * GAP_PENALTY;

    positions.push(found);
    previous = found;
    cursor = found + 1;
  }

  // Shorter haystacks that match are more likely to be what was meant.
  score += Math.max(0, 14 - haystack.length * 0.2);
  // Whole-string containment is a strong signal.
  if (haystack.startsWith(needle)) score += 22;
  else if (haystack.includes(needle)) score += 10;

  return { score, positions };
}

export type Searchable = {
  id: string;
  /** the primary text that is matched */
  title: string;
  /** extra text that can match but is not highlighted */
  keywords?: string;
};

export type Result<T extends Searchable> = {
  item: T;
  score: number;
  positions: number[];
};

/**
 * Ranks items against a query. An empty query returns everything in its
 * original order, so the palette opens as a browsable menu rather than a
 * blank slate.
 */
export function searchItems<T extends Searchable>(query: string, items: T[], limit = 12): Result<T>[] {
  const trimmed = query.trim();
  if (!trimmed) return items.slice(0, limit).map((item) => ({ item, score: 0, positions: [] }));

  const results: Result<T>[] = [];
  for (const item of items) {
    const title = fuzzyMatch(trimmed, item.title);
    const keywords = item.keywords ? fuzzyMatch(trimmed, item.keywords) : null;

    if (!title && !keywords) continue;
    // A keyword-only hit counts, but never outranks a real title hit.
    const score = title ? title.score : (keywords as Match).score * 0.4;

    results.push({ item, score, positions: title ? title.positions : [] });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
