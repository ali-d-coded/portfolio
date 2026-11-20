/** A parallax speed from a data attribute: a number between -1 and 1, else 0. */
export function parseSpeed(value: string | null): number {
  if (value === null) return 0
  let speed = Number.parseFloat(value)
  if (!Number.isFinite(speed) || speed < -1 || speed > 1) return 0
  return speed
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** A mouse or trackpad that can hover: the only place the custom cursor and drag toys make sense. */
export function hasFinePointer(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
