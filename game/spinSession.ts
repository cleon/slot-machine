/**
 * One visible spin. A second start does not finish the first, and settle runs once.
 * That keeps a host round from closing while the reels are still moving.
 */
export class SpinSession {
  private state: 'idle' | 'spinning' = 'idle'
  private landed = 0
  private reels = 0
  private resolve: ((shown: boolean) => void) | null = null

  get isSpinning(): boolean {
    return this.state === 'spinning'
  }

  start(reelCount: number): Promise<boolean> {
    if (this.state === 'spinning' || reelCount <= 0) return Promise.resolve(false)
    this.state = 'spinning'
    this.landed = 0
    this.reels = reelCount
    return new Promise((resolve) => {
      this.resolve = resolve
    })
  }

  /** True only on the landing that completes the set. */
  reelLanded(): boolean {
    if (this.state !== 'spinning') return false
    this.landed += 1
    return this.landed === this.reels
  }

  settle(): void {
    if (this.state !== 'spinning') return
    this.state = 'idle'
    const resolve = this.resolve
    this.resolve = null
    this.landed = 0
    resolve?.(true)
  }
}
