/**
 * Single source of "now" for all time comparisons (locks, countdowns).
 * Outside production, FAKE_NOW (ISO timestamp) overrides the real clock so
 * lock behavior can be tested deterministically.
 */
export function now(): Date {
  const fake = process.env.FAKE_NOW;
  if (fake && process.env.NODE_ENV !== "production") {
    const d = new Date(fake);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}
