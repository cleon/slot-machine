import type { Cell, PayingSymbol, SpinForce, SymbolId, Win } from '../shared/types'
import { FREE_SPINS, LINE_PAYS, LINES, SCATTER_PAY, ofAKind } from './pays'
import type { Rng } from './rng'
import { STRIPS, gridFromStops, stopShowing } from './strips'

export interface Deal {
  stops: number[]
  grid: SymbolId[][]
  wins: Win[]
  totalWinCents: number
  scatterCount: number
  freeSpinsAwarded: number
}

function cell(reel: number, row: number): Cell {
  return { reel, row }
}

function payLine(
  symbols: readonly SymbolId[],
  rows: readonly number[],
  lineIndex: number,
  lineBetCents: number,
  multiplier: number,
): Win | null {
  let wildRun = 0
  const wildPositions: Cell[] = []
  for (let reel = 0; reel < symbols.length; reel++) {
    if (symbols[reel] !== 'wild') break
    wildRun++
    const row = rows[reel]
    if (row === undefined) break
    wildPositions.push(cell(reel, row))
  }

  let target: PayingSymbol | null = null
  let run = 0
  const positions: Cell[] = []
  for (let reel = 0; reel < symbols.length; reel++) {
    const symbol = symbols[reel]
    const row = rows[reel]
    if (symbol === undefined || row === undefined) break
    if (symbol === 'scatter') break
    if (symbol !== 'wild') {
      if (target === null) target = symbol
      else if (symbol !== target) break
    }
    run++
    positions.push(cell(reel, row))
  }

  // A leading wild run is its own prize when that pays more than the substituted symbol.
  const candidates: Win[] = []
  if (wildRun >= 3) {
    candidates.push({
      kind: 'line',
      lineIndex,
      symbol: 'wild',
      count: wildRun,
      amountCents: ofAKind(LINE_PAYS.wild, wildRun) * lineBetCents * multiplier,
      positions: wildPositions,
    })
  }
  if (target && run >= 3) {
    candidates.push({
      kind: 'line',
      lineIndex,
      symbol: target,
      count: run,
      amountCents: ofAKind(LINE_PAYS[target], run) * lineBetCents * multiplier,
      positions,
    })
  }
  candidates.sort((a, b) => b.amountCents - a.amountCents || b.count - a.count)
  return candidates[0] ?? null
}

export function evaluateGrid(grid: SymbolId[][], totalBetCents: number, multiplier: number): Omit<Deal, 'stops' | 'grid'> {
  if (totalBetCents % LINES.length !== 0) {
    throw new Error('total bet must divide evenly across the fixed lines')
  }
  const lineBetCents = totalBetCents / LINES.length
  const wins: Win[] = []

  LINES.forEach((rows, lineIndex) => {
    const symbols = rows.map((row, reel) => {
      const column = grid[reel]
      const symbol = column?.[row]
      if (!symbol) throw new Error(`grid missing ${reel},${row}`)
      return symbol
    })
    const win = payLine(symbols, rows, lineIndex, lineBetCents, multiplier)
    if (win) wins.push(win)
  })

  const scatterPositions: Cell[] = []
  grid.forEach((column, reel) => {
    column.forEach((symbol, row) => {
      if (symbol === 'scatter') scatterPositions.push(cell(reel, row))
    })
  })
  const scatterCount = scatterPositions.length
  const scatterMult = ofAKind(SCATTER_PAY, scatterCount)
  if (scatterMult > 0) {
    wins.push({
      kind: 'scatter',
      lineIndex: null,
      symbol: 'scatter',
      count: scatterCount,
      amountCents: scatterMult * totalBetCents * multiplier,
      positions: scatterPositions,
    })
  }

  const totalWinCents = wins.reduce((sum, win) => sum + win.amountCents, 0)
  return {
    wins,
    totalWinCents,
    scatterCount,
    freeSpinsAwarded: ofAKind(FREE_SPINS, scatterCount),
  }
}

function chooseStops(rng: Rng, force?: SpinForce | null): number[] {
  if (force === 'scatter') {
    return STRIPS.map((strip, reel) =>
      reel % 2 === 0 ? stopShowing(strip, 'scatter', 1) : Math.floor(rng() * strip.length),
    )
  }
  if (force === 'line') {
    return STRIPS.map((strip) => stopShowing(strip, 'h1', 1))
  }
  return STRIPS.map((strip) => Math.floor(rng() * strip.length))
}

/** Local stand-in for a spin endpoint: RNG, stops, grid, and win evaluation. */
export function requestSpin(input: {
  rng: Rng
  totalBetCents: number
  multiplier: number
  force?: SpinForce | null
}): Deal {
  const stops = chooseStops(input.rng, input.force)
  const grid = gridFromStops(STRIPS, stops)
  return { stops, grid, ...evaluateGrid(grid, input.totalBetCents, input.multiplier) }
}
