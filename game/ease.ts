/** Accelerate, cruise, then brake. t and the return value are both 0..1. */
export function slotEase(t: number): number {
  const accel = 0.2
  const brake = 0.32
  if (t <= accel) {
    const u = t / accel
    return accel * 0.32 * u * u
  }
  const cruiseEnd = 1 - brake * 0.5
  if (t >= 1 - brake) {
    const u = (t - (1 - brake)) / brake
    return cruiseEnd + (1 - cruiseEnd) * (1 - (1 - u) ** 3)
  }
  const u = (t - accel) / (1 - accel - brake)
  const start = accel * 0.32
  return start + (cruiseEnd - start) * u
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}
