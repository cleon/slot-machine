import { describe, expect, it } from 'vitest'
import type { SymbolId } from '../shared/types'
import { DemoHost } from './DemoHost'
import { evaluateGrid, requestSpin } from './math'
import { mulberry32 } from './rng'
import { STRIPS } from './strips'

function col(top: SymbolId, mid: SymbolId, bot: SymbolId): SymbolId[] {
  return [top, mid, bot]
}

describe('evaluateGrid', () => {
  it('pays the longest left-to-right run and ignores a broken line', () => {
    const grid = [
      col('l2', 'h1', 'l3'),
      col('l3', 'h1', 'l4'),
      col('l4', 'h1', 'l2'),
      col('m1', 'h1', 'l3'),
      col('m2', 'l1', 'l4'),
    ]
    const deal = evaluateGrid(grid, 1000, 1)
    expect(deal.wins).toHaveLength(1)
    expect(deal.wins[0]).toMatchObject({ kind: 'line', symbol: 'h1', count: 4, amountCents: 12000 })
  })

  it('does not pay matches that start past reel 0', () => {
    const grid = [
      col('l2', 'l2', 'm1'),
      col('l3', 'l3', 'm2'),
      col('l1', 'l1', 'h1'),
      col('l1', 'l1', 'h1'),
      col('l1', 'l1', 'h1'),
    ]
    const deal = evaluateGrid(grid, 1000, 1)
    expect(deal.totalWinCents).toBe(0)
  })

  it('lets a leading wild run pay when that beats the substituted symbol', () => {
    const symbolsGrid = [
      col('wild', 'l2', 'l3'),
      col('wild', 'l3', 'l4'),
      col('wild', 'l4', 'm1'),
      col('l1', 'm1', 'm2'),
      col('scatter', 'm2', 'l1'),
    ]
    const deal = evaluateGrid(symbolsGrid, 1000, 1)
    const top = deal.wins.find((win) => win.lineIndex === 1)
    expect(top).toMatchObject({ symbol: 'wild', count: 3, amountCents: 5000 })
  })

  it('substitutes wilds into a higher natural run', () => {
    const grid = [
      col('l2', 'wild', 'l3'),
      col('l3', 'wild', 'l4'),
      col('l4', 'l1', 'm1'),
      col('m1', 'l1', 'm2'),
      col('m2', 'l1', 'l2'),
    ]
    const deal = evaluateGrid(grid, 1000, 1)
    const middle = deal.wins.find((win) => win.lineIndex === 0)
    expect(middle).toMatchObject({ symbol: 'l1', count: 5, amountCents: 3000 })
  })

  it('pays scatter anywhere and awards free spins without a line', () => {
    const grid = [
      col('scatter', 'l1', 'l2'),
      col('scatter', 'l3', 'l4'),
      col('scatter', 'm1', 'm2'),
      col('l1', 'l2', 'l3'),
      col('l4', 'm1', 'm2'),
    ]
    const deal = evaluateGrid(grid, 1000, 1)
    expect(deal.scatterCount).toBe(3)
    expect(deal.freeSpinsAwarded).toBe(8)
    expect(deal.wins).toEqual([
      expect.objectContaining({ kind: 'scatter', count: 3, amountCents: 2000 }),
    ])
  })

  it('applies the feature multiplier to line and scatter pays', () => {
    const grid = [
      col('scatter', 'h1', 'l2'),
      col('l2', 'h1', 'l3'),
      col('l3', 'h1', 'l4'),
      col('scatter', 'l1', 'm1'),
      col('scatter', 'l2', 'm2'),
    ]
    const deal = evaluateGrid(grid, 1000, 2)
    const line = deal.wins.find((win) => win.symbol === 'h1')
    const scatter = deal.wins.find((win) => win.kind === 'scatter')
    expect(line?.amountCents).toBe(8000)
    expect(scatter?.amountCents).toBe(4000)
  })
})

describe('strips', () => {
  it('keeps the two scatters more than a window apart', () => {
    for (const strip of STRIPS) {
      expect(strip).toHaveLength(29)
      const at = strip.flatMap((symbol, index) => (symbol === 'scatter' ? [index] : []))
      expect(at).toHaveLength(2)
      expect((at[1] ?? 0) - (at[0] ?? 0)).toBeGreaterThan(3)
      for (const id of ['l1', 'l2', 'l3', 'l4', 'm1', 'm2', 'h1', 'wild'] as const) {
        expect(strip).toContain(id)
      }
    }
  })
})

describe('DemoHost', () => {
  it('debits on the request and credits when the game finishes presenting', () => {
    const host = new DemoHost({ rng: mulberry32(1), balanceCents: 10_000, betIndex: 3 })
    const events: string[] = []
    host.on('balanceUpdate', (payload) => events.push(payload.reason))
    host.on('spinStart', () => events.push('spinStart'))
    host.on('spinStop', () => events.push('spinStop'))

    const started = host.snapshot.balanceCents
    void host.spin()
    expect(host.snapshot.balanceCents).toBe(started - 1000)
    expect(host.snapshot.busy).toBe(true)
    host.completePresentation()
    expect(events[0]).toBe('debit')
    expect(events).toContain('spinStart')
    expect(events.at(-1)).toBe('spinStop')
    expect(host.snapshot.busy).toBe(false)
  })

  it('is idle when spinStop fires so the shell can show Spin again', () => {
    const host = new DemoHost({ rng: () => 0, balanceCents: 5000, betIndex: 0 })
    let busyAtStop: boolean | null = null
    host.on('spinStop', () => {
      busyAtStop = host.snapshot.busy
    })
    void host.spin()
    host.completePresentation()
    expect(busyAtStop).toBe(false)
  })

  it('rejects a spin the wallet cannot cover and a second spin while busy', async () => {
    const host = new DemoHost({ rng: () => 0, balanceCents: 50, betIndex: 2 })
    const reasons: string[] = []
    host.on('rejected', (payload) => reasons.push(payload.reason))
    expect(await host.spin()).toBe(false)
    expect(reasons).toEqual(['insufficient'])
    expect(host.snapshot.balanceCents).toBe(50)

    const funded = new DemoHost({ rng: () => 0, balanceCents: 5000, betIndex: 0 })
    void funded.spin()
    expect(await funded.spin()).toBe(false)
  })

  it('plays an awarded feature without debiting and closes it on the last spin', async () => {
    const host = new DemoHost({ rng: () => 0, balanceCents: 50_000, betIndex: 3 })
    host.armForce('scatter')
    const started: { remaining: number; win: number; active: boolean }[] = []
    host.on('spinStart', ({ result }) => {
      started.push({
        remaining: result.feature.remaining,
        win: result.totalWinCents,
        active: result.feature.active,
      })
    })
    let featureAward = 0
    let featureTotal = -1
    host.on('featureStart', (payload) => {
      featureAward = payload.awarded
    })
    host.on('featureEnd', (payload) => {
      featureTotal = payload.totalWinCents
    })

    expect(await host.spin()).toBe(true)
    const trigger = started[0]
    expect(trigger?.active).toBe(false)
    expect(featureAward).toBe(0)
    host.completePresentation()
    expect(featureAward).toBe(8)
    expect(host.snapshot.freeSpinsRemaining).toBe(8)

    const afterTrigger = host.snapshot.balanceCents
    for (let spin = 0; spin < 8; spin++) {
      const before = host.snapshot.balanceCents
      expect(await host.spin()).toBe(true)
      const current = started.at(-1)
      expect(current?.active).toBe(true)
      host.completePresentation()
      expect(host.snapshot.balanceCents - before).toBe(current?.win ?? -1)
    }
    expect(host.snapshot.freeSpinsRemaining).toBe(0)
    expect(featureTotal).toBeGreaterThanOrEqual(0)
    expect(host.snapshot.balanceCents).toBeGreaterThanOrEqual(afterTrigger)
    expect(host.snapshot.busy).toBe(false)
  })

  it('is deterministic for a seed', () => {
    const a = requestSpin({ rng: mulberry32(42), totalBetCents: 1000, multiplier: 1 })
    const b = requestSpin({ rng: mulberry32(42), totalBetCents: 1000, multiplier: 1 })
    expect(a.stops).toEqual(b.stops)
    expect(a.grid).toEqual(b.grid)
    expect(a.totalWinCents).toBe(b.totalWinCents)
  })
})
