export const CELL = 128
export const GAP = 18
export const REEL_COUNT = 5
export const ROW_COUNT = 3

export const BLOCK_W = REEL_COUNT * CELL + (REEL_COUNT - 1) * GAP
export const BLOCK_H = ROW_COUNT * CELL
export const DESIGN_W = BLOCK_W + 88
export const DESIGN_H = BLOCK_H + 64
export const ORIGIN_X = 44
export const ORIGIN_Y = 32

export function cellCenter(reel: number, row: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + reel * (CELL + GAP) + CELL / 2,
    y: ORIGIN_Y + row * CELL + CELL / 2,
  }
}
