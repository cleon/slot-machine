import { describe, expect, it } from 'vitest'
import { reelCurve, settleBump } from './ease'

describe('reelCurve', () => {
  it('starts at 0, ends at 1, and never runs past the stop in normalized space', () => {
    expect(reelCurve(0)).toBe(0)
    expect(reelCurve(1)).toBe(1)
    expect(reelCurve(0.5)).toBeGreaterThan(reelCurve(0.2))
    expect(reelCurve(0.5)).toBeLessThanOrEqual(1)
    expect(reelCurve(0.9)).toBeLessThanOrEqual(1)
  })

  it('overshoots by a fraction of a symbol, then lands exactly', () => {
    expect(settleBump(0.5)).toBe(0)
    expect(settleBump(0.9)).toBeGreaterThan(0.1)
    expect(settleBump(1)).toBe(0)
  })
})