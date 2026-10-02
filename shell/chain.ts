export interface ChainInput {
  autoRemaining: number
  /** Stop was pressed. Clears the autoplay run, including the gap between spins. */
  stopRequested: boolean
}

/**
 * The next spin starts only for an autoplay run the player asked for.
 * Free spins wait for Spin (or for that same autoplay run). They do not chain on their own.
 */
export function shouldChainSpin(input: ChainInput): boolean {
  return !input.stopRequested && input.autoRemaining > 0
}
