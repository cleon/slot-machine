import { mod, type SymbolId } from '../shared/types'
import { mulberry32, type Rng } from './rng'

const SPEC: readonly (readonly [SymbolId, number])[] = [
  ['l1', 5],
  ['l2', 5],
  ['l3', 4],
  ['l4', 4],
  ['m1', 3],
  ['m2', 2],
  ['h1', 2],
  ['wild', 2],
]

function shuffle(items: SymbolId[], rng: Rng): SymbolId[] {
  const next = items.slice()
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = next[i]
    const b = next[j]
    if (a === undefined || b === undefined) continue
    next[i] = b
    next[j] = a
  }
  return next
}

/** 29 stops. Scatters are fixed far apart so one window shows at most one. */
export function buildStrip(seed: number): SymbolId[] {
  const rng = mulberry32(seed)
  const pool: SymbolId[] = []
  for (const [id, count] of SPEC) {
    for (let i = 0; i < count; i++) pool.push(id)
  }
  const strip = shuffle(pool, rng)
  strip.splice(4, 0, 'scatter')
  strip.splice(19, 0, 'scatter')
  return strip
}

export const STRIPS: SymbolId[][] = [11, 29, 47, 71, 97].map((seed) => buildStrip(seed))

export function gridFromStops(strips: readonly (readonly SymbolId[])[], stops: readonly number[]): SymbolId[][] {
  return stops.map((stop, reel) => {
    const strip = strips[reel]
    if (!strip || strip.length === 0) throw new Error(`strip ${reel} is empty`)
    return [0, 1, 2].map((row) => {
      const symbol = strip[mod(stop + row, strip.length)]
      if (!symbol) throw new Error(`strip ${reel} has a hole`)
      return symbol
    })
  })
}

export function stopShowing(strip: readonly SymbolId[], symbol: SymbolId, row: number): number {
  const at = strip.indexOf(symbol)
  if (at < 0) return 0
  return mod(at - row, strip.length)
}
