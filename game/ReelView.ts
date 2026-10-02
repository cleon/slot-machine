import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import type { SymbolId } from '../shared/types'
import { mod } from '../shared/types'
import { easeOutCubic, slotEase } from './ease'
import { CELL, ROW_COUNT } from './layout'
import { motionFor } from './spineSlot'

interface SymbolView {
  root: Container
  sprite: Sprite
  label: Text
  badge: Graphics
  current: SymbolId | null
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
    this.draw(0, null, false)
  }

  spinTo(stop: number, duration: number, now: number): void {
    const currentTop = this.topAt(this.travel)
    let delta = mod(currentTop - stop, this.strip.length)
    delta += (2 + this.index) * this.strip.length
    this.motion = {
      from: this.travel,
      to: this.travel + delta,
      t0: now,
      duration: Math.max(180, duration),
      ease: slotEase,
    }
    this.settled = false
    this.landAt = 0
  }

  slam(now: number): void {
    if (!this.motion) return
    const elapsed = now - this.motion.t0
    const t = Math.min(1, elapsed / this.motion.duration)
    const pos = this.motion.from + (this.motion.to - this.motion.from) * this.motion.ease(t)
    this.motion = {
      from: pos,
      to: this.motion.to,
      t0: now,
      duration: 120 + this.index * 45,
      ease: easeOutCubic,
    }
  }

  /** Returns true on the frame the reel lands. */
  update(now: number, winRows: ReadonlySet<number> | null, pulse: boolean): boolean {
    let justLanded = false
    let pos = this.travel
    if (this.motion) {
      const t = Math.min(1, (now - this.motion.t0) / this.motion.duration)
      pos = this.motion.from + (this.motion.to - this.motion.from) * this.motion.ease(t)
      if (t >= 1) {
        pos = this.motion.to
        this.travel = pos
        this.motion = null
        this.settled = true
        this.landAt = now
        justLanded = true
      }
    }
    this.draw(pos, winRows, pulse, now)
    return justLanded
  }

  private topAt(travel: number): number {
    return mod(this.anchorTop - Math.floor(travel), this.strip.length)
  }

  private draw(pos: number, winRows: ReadonlySet<number> | null, pulse: boolean, now = 0): void {
    const shifted = Math.floor(pos)
    const frac = pos - shifted
    const top = mod(this.anchorTop - shifted, this.strip.length)
    let squashX = 1
    let squashY = 1
    if (this.landAt) {
      const p = (now - this.landAt) / 340
      if (p >= 1) this.landAt = 0
      else {
        const s = Math.sin(Math.PI * p)
        squashX = 1 + 0.14 * s
        squashY = 1 - 0.2 * s
      }
    }

    for (let i = 0; i < this.views.length; i++) {
      const view = this.views[i]
      if (!view) continue
      const d = i - 1
      const symbol = this.strip[mod(top + d, this.strip.length)]
      if (!symbol) continue
      this.paint(view, symbol)

      const visible = d >= 0 && d < ROW_COUNT
      const winner = visible && winRows?.has(d) === true
      const bob =
        this.settled && !this.landAt && !winRows
          ? Math.sin(now / 380 + this.index * 0.8 + d) * 3.2
          : 0
      const beat = winner && pulse ? 1 + Math.sin(now / 150) * 0.07 : 1
      view.root.scale.set(squashX * beat, squashY * beat)
      view.root.position.set(CELL / 2, (d + frac) * CELL + CELL / 2 + bob)
      view.root.alpha = visible && winRows && !winner ? 0.3 : 1
    }
  }

  private paint(view: SymbolView, symbol: SymbolId): void {
    if (view.current === symbol) return
    view.current = symbol
    const texture = this.textures[symbol]
    if (texture) view.sprite.texture = texture
    const labeled = symbol === 'h1' || symbol === 'wild' || symbol === 'scatter'
    view.label.visible = labeled
    view.badge.visible = symbol === 'wild' || symbol === 'scatter'
    if (symbol === 'h1') {
      view.label.text = 'G'
      view.label.style.fontSize = 44
      view.label.position.y = CELL * 0.66
    } else if (symbol === 'wild') {
      view.label.text = 'WILD'
      view.label.style.fontSize = 22
      view.label.position.y = CELL * 0.72
    } else if (symbol === 'scatter') {
      view.label.text = 'SCATTER'
      view.label.style.fontSize = 15
      view.label.position.y = CELL * 0.72
    }
    if (view.badge.visible) {
      const width = symbol === 'scatter' ? 108 : 82
      view.badge.clear()
      view.badge.beginFill(0x14120b, 0.22)
      view.badge.drawRoundedRect(-width / 2, -14, width, 28, 10)
      view.badge.endFill()
      view.badge.position.set(CELL / 2, view.label.position.y)
    }
  }

  private createView(): SymbolView {
    motionFor(this.strip[0] ?? 'l1')
    const root = new Container()
    root.pivot.set(CELL / 2, CELL / 2)
    const sprite = new Sprite(this.textures.l1)
    sprite.anchor.set(0.5)
    sprite.position.set(CELL / 2, CELL / 2)
    sprite.width = CELL - 8
    sprite.height = CELL - 8
    const label = new Text(
      '',
      new TextStyle({
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: 22,
        fill: '#fffdf8',
        align: 'center',
      }),
    )
    label.anchor.set(0.5)
    label.position.set(CELL / 2, CELL * 0.7)
    label.resolution = 2
    const badge = new Graphics()
    root.addChild(sprite, badge, label)
    return { root, sprite, label, badge, current: null }
  }
}
