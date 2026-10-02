import { Container, Graphics, Sprite, Texture } from 'pixi.js'
import type { SymbolId } from '../shared/types'
import { mod } from '../shared/types'
import { easeOutCubic, reelCurve, settleBump } from './ease'
import { CELL, ROW_COUNT } from './layout'
import { motionFor } from './spineSlot'

interface SymbolView {
  root: Container
  sprite: Sprite
  trail: Sprite
  current: SymbolId | null
  teaseUntil: number
}

interface Motion {
  from: number
  to: number
  t0: number
  duration: number
  ease: (t: number) => number
}

export class ReelView {
  readonly root = new Container()
  private readonly views: SymbolView[] = []
  private readonly mask: Graphics
  private motion: Motion | null = null
  private travel = 0
  private lastPos = 0
  private readonly anchorTop = 0
  private landAt = 0
  private settled = true

  constructor(
    private readonly strip: readonly SymbolId[],
    private readonly textures: Record<SymbolId, Texture>,
    private readonly index: number,
    x: number,
    y: number,
  ) {
    this.root.position.set(x, y)

    const plate = new Graphics()
    plate.beginFill(0x171513)
    plate.drawRoundedRect(0, 0, CELL, CELL * ROW_COUNT, 22)
    plate.endFill()
    this.root.addChild(plate)

    this.mask = new Graphics()
    this.mask.beginFill(0xffffff)
    this.mask.drawRoundedRect(0, 0, CELL, CELL * ROW_COUNT, 22)
    this.mask.endFill()

    const symbols = new Container()
    symbols.mask = this.mask
    this.root.addChild(symbols, this.mask)

    for (let i = 0; i < ROW_COUNT + 2; i++) {
      const view = this.createView()
      this.views.push(view)
      symbols.addChild(view.root)
    }
    this.draw(0, null, false, 0, false)
  }

  spinTo(stop: number, duration: number, now: number): void {
    const currentTop = this.topAt(this.travel)
    let delta = mod(currentTop - stop, this.strip.length)
    delta += (3 + this.index) * this.strip.length
    this.motion = {
      from: this.travel,
      to: this.travel + delta,
      t0: now,
      duration: Math.max(240, duration),
      ease: reelCurve,
    }
    this.settled = false
    this.landAt = 0
    this.lastPos = this.travel
  }

  slam(now: number): void {
    if (!this.motion) return
    const elapsed = Math.max(0, now - this.motion.t0)
    const t = Math.min(1, elapsed / this.motion.duration)
    const pos = this.motion.from + (this.motion.to - this.motion.from) * this.motion.ease(t)
    this.motion = {
      from: pos,
      to: this.motion.to,
      t0: now,
      duration: 150 + this.index * 55,
      ease: easeOutCubic,
    }
  }

  /** Snap to the planned stop. Used when a spin has run past its deadline. */
  halt(now: number): void {
    if (this.motion) this.travel = this.motion.to
    this.motion = null
    this.settled = true
    this.landAt = now
    this.lastPos = this.travel
  }

  /** Returns the visible symbols on the frame the reel lands. */
  update(now: number, winRows: ReadonlySet<number> | null, pulse: boolean): { landed: boolean; visible: SymbolId[] } {
    let justLanded = false
    let pos = this.travel
    if (this.motion) {
      let elapsed = now - this.motion.t0
      if (elapsed < 0) {
        this.motion.t0 = now
        elapsed = 0
      }
      const t = Math.min(1, elapsed / this.motion.duration)
      pos = this.motion.from + (this.motion.to - this.motion.from) * this.motion.ease(t) + settleBump(t)
      if (t >= 1 || elapsed > this.motion.duration + 40) {
        pos = this.motion.to
        this.travel = pos
        this.motion = null
        this.settled = true
        this.landAt = now
        justLanded = true
      }
    }
    const speed = pos - this.lastPos
    this.lastPos = this.motion ? pos : this.travel
    const visible = this.draw(pos, winRows, pulse, now, justLanded, speed)
    return { landed: justLanded, visible }
  }

  private topAt(travel: number): number {
    return mod(this.anchorTop - Math.floor(travel), this.strip.length)
  }

  private draw(
    pos: number,
    winRows: ReadonlySet<number> | null,
    pulse: boolean,
    now: number,
    justLanded: boolean,
    speed = 0,
  ): SymbolId[] {
    const shifted = Math.floor(pos)
    const frac = pos - shifted
    const top = mod(this.anchorTop - shifted, this.strip.length)
    const spinning = this.motion !== null
    const stretch = spinning ? 1 + Math.min(0.38, Math.abs(speed) * 0.16) : 1
    const trailAlpha = spinning ? Math.min(0.22, Math.abs(speed) * 0.08) : 0
    let squashX = 1
    let squashY = 1
    if (this.landAt && !spinning) {
      const p = (now - this.landAt) / 480
      if (p >= 1) this.landAt = 0
      else {
        const s = Math.sin(p * Math.PI) * (1 - p * 0.35)
        squashX = 1 + 0.18 * s
        squashY = 1 - 0.26 * s
      }
    }

    const visible: SymbolId[] = []
    for (let i = 0; i < this.views.length; i++) {
      const view = this.views[i]
      if (!view) continue
      const d = i - 1
      const symbol = this.strip[mod(top + d, this.strip.length)]
      if (!symbol) continue
      this.paint(view, symbol)
      const onScreen = d >= 0 && d < ROW_COUNT
      if (onScreen) visible.push(symbol)
      if (justLanded && onScreen && symbol === 'scatter') view.teaseUntil = now + 720

      const winner = onScreen && winRows?.has(d) === true
      const teasing = now < view.teaseUntil
      const bob =
        this.settled && !this.landAt && !winRows && !teasing
          ? Math.sin(now / 420 + this.index * 0.7 + d) * 4
          : 0
      const breathe = this.settled && !this.landAt && !spinning ? 1 + Math.sin(now / 560 + d + this.index) * 0.03 : 1
      const beat = teasing
        ? 1.1 + Math.sin(now / 70) * 0.05
        : winner && pulse
          ? 1 + Math.sin(now / 140) * 0.08
          : 1
      view.root.scale.set(squashX * beat * breathe, squashY * beat * breathe)
      view.root.position.set(CELL / 2, (d + frac) * CELL + CELL / 2 + bob)
      view.root.alpha = onScreen && winRows && !winner && !teasing ? 0.28 : 1
      fitSymbol(view.sprite, stretch)
      fitSymbol(view.trail, stretch)
      view.trail.alpha = onScreen ? trailAlpha : 0
      view.trail.position.y = CELL / 2 - Math.sign(speed || 1) * 10
    }
    return visible
  }

  private paint(view: SymbolView, symbol: SymbolId): void {
    if (view.current === symbol) return
    view.current = symbol
    const texture = this.textures[symbol]
    if (!texture) return
    view.sprite.texture = texture
    view.trail.texture = texture
  }

  private createView(): SymbolView {
    motionFor(this.strip[0] ?? 'l1')
    const root = new Container()
    root.pivot.set(CELL / 2, CELL / 2)
    const sprite = new Sprite(this.textures.l1)
    sprite.anchor.set(0.5)
    sprite.position.set(CELL / 2, CELL / 2)
    const trail = new Sprite(this.textures.l1)
    trail.anchor.set(0.5)
    trail.position.set(CELL / 2, CELL / 2)
    trail.alpha = 0
    fitSymbol(sprite, 1)
    fitSymbol(trail, 1)
    root.addChild(trail, sprite)
    return { root, sprite, trail, current: null, teaseUntil: 0 }
  }
}

function fitSymbol(sprite: Sprite, stretchY: number): void {
  const width = sprite.texture.width || 1
  const base = (CELL - 6) / width
  sprite.scale.set(base, base * stretchY)
}
