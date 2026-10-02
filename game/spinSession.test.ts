import { describe, expect, it } from 'vitest'
import { SpinSession } from './spinSession'

describe('SpinSession', () => {
  it('does not resolve a second start, and settles only after every reel lands', async () => {
    const session = new SpinSession()
    const first = session.start(3)
    const second = session.start(3)
    await expect(second).resolves.toBe(false)
    expect(session.isSpinning).toBe(true)
    expect(session.reelLanded()).toBe(false)
    expect(session.reelLanded()).toBe(false)
    expect(session.reelLanded()).toBe(true)
    expect(session.reelLanded()).toBe(false)
    session.settle()
    await expect(first).resolves.toBe(true)
    expect(session.isSpinning).toBe(false)
    session.settle()
    expect(session.isSpinning).toBe(false)
  })

  it('can be forced to settle so a stuck reel cannot hold the wallet', async () => {
    const session = new SpinSession()
    const pending = session.start(5)
    session.settle()
    await expect(pending).resolves.toBe(true)
    expect(session.isSpinning).toBe(false)
  })
})
