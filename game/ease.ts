/**
 * Slow start, fast cruise, then brake. t and the return value stay in 0..1.
 * Overshoot is applied separately in symbol units so a long travel does not jump.
 */
export function reelCurve(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  if (t < 0.18) return (t / 0.18) ** 2 * 0.08
  if (t < 0.74) {
    const u = (t - 0.18) / 0.56
    return 0.08 + u * 0.8
  }
  const u = (t - 0.74) / 0.26
  const eased = 1 - (1 - u) ** 3
  return 0.88 + eased * 0.12
}

/** Extra travel in symbol units during the brake. Zero at the landing frame. */
export function settleBump(t: number): number {
  if (t < 0.78 || t >= 1) return 0
  const u = (t - 0.78) / 0.22
  return Math.sin(u * Math.PI) * 0.22
}

export function easeOutCubic(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return 1 - (1 - u) ** 3
}
