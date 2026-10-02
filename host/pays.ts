import type { OfAKind, PayingSymbol } from '../shared/types'

export const LINE_PAYS: Record<PayingSymbol, OfAKind> = {
  l1: { three: 5, four: 12, five: 30 },
  l2: { three: 5, four: 12, five: 30 },
  l3: { three: 8, four: 18, five: 40 },
  l4: { three: 8, four: 20, five: 50 },
  m1: { three: 15, four: 40, five: 100 },
  m2: { three: 20, four: 60, five: 150 },
  h1: { three: 40, four: 120, five: 400 },
  wild: { three: 50, four: 200, five: 750 },
}

/** Multipliers of total bet, not line bet. */
export const SCATTER_PAY: OfAKind = { three: 2, four: 10, five: 40 }

export const FREE_SPINS: OfAKind = { three: 8, four: 12, five: 20 }

export function ofAKind(pay: OfAKind, count: number): number {
  if (count >= 5) return pay.five
  if (count === 4) return pay.four
  if (count === 3) return pay.three
  return 0
}

/** Ten fixed lines. Each entry is the row index per reel. */
export const LINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
]
