import type { SymbolId } from '../shared/types'

export function scatterReels(grid: readonly (readonly SymbolId[])[]): number[] {
  const found: number[] = []
  grid.forEach((column, reel) => {
    if (column.includes('scatter')) found.push(reel)
  })
  return found
}

/** Extra milliseconds for reels that stop after a second scatter is already due. */
export function extraSpinMs(reel: number, scatters: readonly number[], fast: boolean): number {
  if (scatters.length < 2) return 0
  const firstHeld = (scatters[1] ?? -1) + 1
  if (reel < firstHeld) return 0
  const step = fast ? 420 : 860
  return step * (reel - firstHeld + 1)
}
