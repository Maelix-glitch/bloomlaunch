/**
 * A refcounted scroll lock for the full page.
 *
 * Several layers need the page to hold still — the preloader while it loads,
 * the gate while it stands, the command palette while it is open. The naive
 * pattern ("remember the previous overflow, restore it when done") breaks the
 * moment two lockers overlap: the second one remembers the first one's
 * "hidden" and dutifully restores it after everyone else has let go, leaving
 * the revealed site permanently unscrollable.
 *
 * Instead: each locker acquires a token, and the page stays locked while at
 * least one token is alive. Releasing is idempotent, so a double cleanup from
 * StrictMode or HMR can never unlock a lock someone else still holds.
 */

const owners = new Set<symbol>();

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.style.overflow = owners.size > 0 ? "hidden" : "";
}

/** Lock the page scroll; the returned function releases this locker's hold. */
export function acquireScrollLock(): () => void {
  const token = Symbol("bloom-scroll-lock");
  owners.add(token);
  apply();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    owners.delete(token);
    apply();
  };
}
