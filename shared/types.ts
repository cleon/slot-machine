export const SYMBOL_IDS = [
  'l1',
  'l2',
  'l3',
  'l4',
  'm1',
  'm2',
  'h1',
  'wild',
  'scatter',
] as const

export type SymbolId = (typeof SYMBOL_IDS)[number]

export type PayingSymbol = Exclude<SymbolId, 'scatter'>

export type SymbolTier = 'low' | 'mid' | 'high' | 'special'

export const SYMBOL_TIER: Record<SymbolId, SymbolTier> = {
  l1: 'low',
  l2: 'low',
  l3: 'low',
  l4: 'low',
  m1: 'mid',
  m2: 'mid',
  h1: 'high',
  wild: 'special',
  scatter: 'special',
}

export interface Cell {
  reel: number
  row: number
}

export interface Win {
  kind: 'line' | 'scatter'
  lineIndex: number | null
  symbol: SymbolId
  count: number
  amountCents: number
  positions: Cell[]
}

/** Of-a-kind multipliers. Line symbols multiply the line bet; scatter multiplies total bet. */
export interface OfAKind {
  three: number
  four: number
  five: number
}

export interface FeatureSnapshot {
  /** This spin was played with the free-spin wallet (no debit). */
  active: boolean
  awarded: number
  /** Free spins still to play after this spin resolves. */
  remaining: number
  /** Multiplier that applied to this spin's wins. */
  multiplier: number
}

export interface SpinResult {
  roundId: string
  stops: number[]
  /** grid[reel][row] */
  grid: SymbolId[][]
  wins: Win[]
  totalWinCents: number
  scatterCount: number
  betCents: number
  feature: FeatureSnapshot
}

export type SpinForce = 'scatter' | 'line'

export interface LaunchConfig {
  demo: true
  currency: 'CREDITS'
  balanceCents: number
  betLevelsCents: number[]
  betIndex: number
  rows: number
  strips: SymbolId[][]
  lines: readonly (readonly number[])[]
  linePays: Record<PayingSymbol, OfAKind>
  scatterPay: OfAKind
  freeSpins: OfAKind
  freeSpinMultiplier: number
}

export interface HostEventMap {
  balanceUpdate: {
    balanceCents: number
    deltaCents: number
    reason: 'debit' | 'credit'
  }
  spinStart: {
    roundId: string
    betCents: number
    freeSpin: boolean
    result: SpinResult
  }
  spinStop: { roundId: string; totalWinCents: number }
  win: { roundId: string; totalWinCents: number; wins: Win[] }
  featureStart: { awarded: number; remaining: number; multiplier: number }
  featureEnd: { totalWinCents: number }
  rejected: { reason: 'insufficient' | 'busy' }
}

export type HostEventName = keyof HostEventMap

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function formatCredits(cents: number, locale = 'en-US'): string {
  const sign = cents < 0 ? -1 : 1
  const abs = Math.abs(Math.trunc(cents))
  const value = sign * (Math.trunc(abs / 100) + (abs % 100) / 100)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
