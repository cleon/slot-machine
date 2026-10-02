import { describe, expect, it } from 'vitest'
import { shouldChainSpin } from './chain'

describe('shouldChainSpin', () => {
  it('does not spin again just because free spins are waiting', () => {
    expect(shouldChainSpin({ autoRemaining: 0, stopRequested: false })).toBe(false)
  })

  it('chains only an intentional autoplay run', () => {
    expect(shouldChainSpin({ autoRemaining: 4, stopRequested: false })).toBe(true)
  })

  it('stops the chain when Stop was pressed, even if auto spins remain', () => {
    expect(shouldChainSpin({ autoRemaining: 4, stopRequested: true })).toBe(false)
  })
})
