import { describe, expect, it } from 'vitest'
import { extraSpinMs, scatterReels } from './anticipation'

describe('anticipation', () => {
  it('finds scatter reels from the dealt grid', () => {
    expect(
      scatterReels([
        ['l1', 'scatter', 'l2'],
        ['l1', 'l2', 'l3'],
        ['scatter', 'l1', 'l2'],
      ]),
    ).toEqual([0, 2])
  })

  it('holds only the reels after the second scatter', () => {
    expect(extraSpinMs(0, [0, 2], false)).toBe(0)
    expect(extraSpinMs(2, [0, 2], false)).toBe(0)
    expect(extraSpinMs(3, [0, 2], false)).toBe(860)
    expect(extraSpinMs(4, [0, 2], false)).toBe(1720)
    expect(extraSpinMs(4, [1], false)).toBe(0)
  })
})
