import type { HostEventMap, HostEventName, LaunchConfig, SpinForce, SpinResult } from '../shared/types'
import demoConfig from './config/demo.json'
import { requestSpin } from './math'
import { FREE_SPINS, LINE_PAYS, LINES, SCATTER_PAY } from './pays'
import type { Rng } from './rng'
import { STRIPS } from './strips'

type Handler<K extends HostEventName> = (payload: HostEventMap[K]) => void

export interface DemoHostOptions {
  rng?: Rng
  balanceCents?: number
  betIndex?: number
}

/**
 * Demo wallet and spin API. Outcomes are decided here; the game only animates them.
 * Play credits only — there is no cashier and no real-money rail.
 */
export class DemoHost {
  readonly #rng: Rng
  readonly #betLevels: number[]
  #balance: number
  #betIndex: number
  #busy = false
  #remaining = 0
  #featureWin = 0
  #round = 0
  #pending: SpinResult | null = null
  #armed: SpinForce | null = null
  #listeners = new Map<HostEventName, Set<Handler<HostEventName>>>()

  constructor(options: DemoHostOptions = {}) {
    this.#rng = options.rng ?? Math.random
    this.#betLevels = demoConfig.betLevelsCents.slice()
    this.#balance = options.balanceCents ?? demoConfig.startingBalanceCents
    const index = options.betIndex ?? demoConfig.defaultBetIndex
    this.#betIndex = clampIndex(index, this.#betLevels.length)
  }

  get snapshot() {
    return {
      balanceCents: this.#balance,
      betCents: this.betCents,
      betIndex: this.#betIndex,
      betLevelsCents: this.#betLevels.slice(),
      busy: this.#busy,
      freeSpinsRemaining: this.#remaining,
      demo: true as const,
    }
  }

  get betCents(): number {
    return this.#betLevels[this.#betIndex] ?? this.#betLevels[0] ?? 0
  }

  launch(): LaunchConfig {
    return {
      demo: true,
      currency: 'CREDITS',
      balanceCents: this.#balance,
      betLevelsCents: this.#betLevels.slice(),
      betIndex: this.#betIndex,
      rows: 3,
      strips: STRIPS.map((strip) => strip.slice()),
      lines: LINES,
      linePays: LINE_PAYS,
      scatterPay: SCATTER_PAY,
      freeSpins: FREE_SPINS,
      freeSpinMultiplier: demoConfig.freeSpinMultiplier,
    }
  }

  on<K extends HostEventName>(event: K, handler: Handler<K>): () => void {
    const set = this.#listeners.get(event) ?? new Set()
    set.add(handler as Handler<HostEventName>)
    this.#listeners.set(event, set)
    return () => set.delete(handler as Handler<HostEventName>)
  }

  setBetIndex(index: number): void {
    if (this.#busy || this.#remaining > 0) return
    this.#betIndex = clampIndex(index, this.#betLevels.length)
  }

  /** One-shot. The next accepted spin uses this instead of the open RNG. */
  armForce(force: SpinForce): void {
    this.#armed = force
  }

  async spin(): Promise<boolean> {
    if (this.#busy) {
      this.#emit('rejected', { reason: 'busy' })
      return false
    }
    const freeSpin = this.#remaining > 0
    const betCents = this.betCents
    if (!freeSpin && this.#balance < betCents) {
      this.#emit('rejected', { reason: 'insufficient' })
      return false
    }

    this.#busy = true
    if (freeSpin) {
      this.#remaining -= 1
    } else {
      this.#balance -= betCents
      this.#featureWin = 0
      this.#emit('balanceUpdate', { balanceCents: this.#balance, deltaCents: -betCents, reason: 'debit' })
    }

    const force = this.#armed
    this.#armed = null
    const deal = requestSpin({
      rng: this.#rng,
      totalBetCents: betCents,
      multiplier: freeSpin ? demoConfig.freeSpinMultiplier : 1,
      force,
    })
    this.#remaining += deal.freeSpinsAwarded
    const result: SpinResult = {
      roundId: `demo-${++this.#round}`,
      stops: deal.stops,
      grid: deal.grid,
      wins: deal.wins,
      totalWinCents: deal.totalWinCents,
      scatterCount: deal.scatterCount,
      betCents,
      feature: {
        active: freeSpin,
        awarded: deal.freeSpinsAwarded,
        remaining: this.#remaining,
        multiplier: freeSpin ? demoConfig.freeSpinMultiplier : 1,
      },
    }
    this.#pending = result
    this.#emit('spinStart', { roundId: result.roundId, betCents, freeSpin, result })
    return true
  }

  /** Game calls this after reels have landed and the win beat has played. */
  completePresentation(): void {
    const pending = this.#pending
    if (!pending) return
    this.#pending = null

    if (pending.totalWinCents > 0) {
      this.#balance += pending.totalWinCents
      if (pending.feature.active) this.#featureWin += pending.totalWinCents
    }
    // Idle before events. spinStop listeners render the button from this flag.
    this.#busy = false

    if (pending.totalWinCents > 0) {
      this.#emit('balanceUpdate', {
        balanceCents: this.#balance,
        deltaCents: pending.totalWinCents,
        reason: 'credit',
      })
      this.#emit('win', {
        roundId: pending.roundId,
        totalWinCents: pending.totalWinCents,
        wins: pending.wins,
      })
    }

    if (pending.feature.awarded > 0) {
      this.#emit('featureStart', {
        awarded: pending.feature.awarded,
        remaining: pending.feature.remaining,
        multiplier: demoConfig.freeSpinMultiplier,
      })
    }

    this.#emit('spinStop', { roundId: pending.roundId, totalWinCents: pending.totalWinCents })

    if (pending.feature.active && pending.feature.remaining === 0) {
      const total = this.#featureWin
      this.#featureWin = 0
      this.#emit('featureEnd', { totalWinCents: total })
    }
  }

  #emit<K extends HostEventName>(event: K, payload: HostEventMap[K]): void {
    const set = this.#listeners.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        ;(handler as Handler<K>)(payload)
      } catch (error) {
        console.error(event, error)
      }
    }
  }
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(length - 1, Math.max(0, Math.trunc(index)))
}
