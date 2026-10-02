import { Application, Container, Graphics, SCALE_MODES, Text, TextStyle, Texture } from 'pixi.js'
import type { SpinResult, SymbolId, Win } from '../shared/types'
import { SYMBOL_IDS } from '../shared/types'
import { symbolUrls } from '../assets/manifest'
import { BLOCK_H, BLOCK_W, CELL, DESIGN_H, DESIGN_W, GAP, ORIGIN_X, ORIGIN_Y, REEL_COUNT, cellCenter } from './layout'
import { extraSpinMs, scatterReels } from './anticipation'
import { ReelView } from './ReelView'
import { SpinSession } from './spinSession'

const LINE_COLORS = [0xff4d6a, 0xffb000, 0x14c48a, 0x3aa0ff, 0xb072f0]

export class SlotGame {
  private app: Application | null = null
  private world: Container | null = null
  private lines: Graphics | null = null
  private burst: Graphics | null = null
  private callout: Text | null = null
  private kicker: Text | null = null
  private reels: ReelView[] = []
  private winRows: Array<Set<number> | null> = []
  private queue: Win[] = []
  private cursor = 0
  private cycleAt = 0
  private pulseUntil = 0
  private burstAt = 0
  private hurried = false
  private fast: boolean
  private pending: SpinResult | null = null
  private watch = 0
  private celebrateTimer = 0
  private celebrating = false
  private readonly session = new SpinSession()
  private resizeObs: ResizeObserver | null = null

  onReelStop: ((symbols: SymbolId[]) => void) | null = null
  onCelebrate: ((result: SpinResult) => void) | null = null

  constructor(
    private readonly el: HTMLElement,
    options: { fast?: boolean } = {},
  ) {
    this.fast = options.fast ?? false
  }

  setFast(on: boolean): void {
    this.fast = on
  }

  async load(strips: SymbolId[][]): Promise<void> {
    await Promise.race([
      document.fonts.load('800 44px Outfit'),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ])
    const textures = await loadTextures()
    const app = new Application({
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      width: this.el.clientWidth || DESIGN_W,
      height: this.el.clientHeight || DESIGN_H,
    })
    this.app = app
    this.el.appendChild(app.view as HTMLCanvasElement)

    const world = new Container()
    this.world = world
    app.stage.addChild(world)

    const dots = new Graphics()
    const candy: Array<[number, number, number]> = [
      [16, 18, 0xc17a3a],
      [DESIGN_W - 18, 20, 0x00cd68],
      [18, DESIGN_H - 16, 0x0086ff],
      [DESIGN_W - 20, DESIGN_H - 18, 0xff009d],
    ]
    for (const [x, y, color] of candy) {
      dots.beginFill(color)
      dots.drawCircle(x, y, 7)
      dots.endFill()
    }
    world.addChild(dots)

    this.reels = []
    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const strip = strips[reel]
      if (!strip) throw new Error(`missing strip ${reel}`)
      const view = new ReelView(strip, textures, reel, ORIGIN_X + reel * (CELL + GAP), ORIGIN_Y)
      this.reels.push(view)
      world.addChild(view.root)
    }

    this.lines = new Graphics()
    this.burst = new Graphics()
    this.burst.visible = false
    const centerX = ORIGIN_X + BLOCK_W / 2
    const centerY = ORIGIN_Y + BLOCK_H / 2
    this.burst.position.set(centerX, centerY)
    for (const color of [0xff009d, 0x00cd68, 0xff9100, 0x0086ff]) {
      this.burst.beginFill(color, 0.9)
      this.burst.drawCircle((color % 40) - 16, ((color >> 4) % 30) - 10, 18)
      this.burst.endFill()
    }

    this.kicker = new Text(
      '',
      new TextStyle({
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: 28,
        fill: '#fffdf8',
        align: 'center',
      }),
    )
    this.kicker.anchor.set(0.5)
    this.kicker.position.set(centerX, centerY - 28)
    this.kicker.visible = false
    this.kicker.resolution = 2

    this.callout = new Text(
      '',
      new TextStyle({
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: 42,
        fill: '#171513',
        align: 'center',
      }),
    )
    this.callout.anchor.set(0.5)
    this.callout.position.set(centerX, centerY + 18)
    this.callout.visible = false
    this.callout.resolution = 2

    world.addChild(this.lines, this.burst, this.kicker, this.callout)

    app.ticker.add(() => {
      const now = performance.now()
      const pulse = now < this.pulseUntil
      let completed = false
      for (const [index, reel] of this.reels.entries()) {
        const frame = reel.update(now, this.winRows[index] ?? null, pulse)
        if (!frame.landed) continue
        this.onReelStop?.(frame.visible)
        if (this.session.reelLanded()) completed = true
      }
      if (completed) this.beginCelebration()
      this.tickCelebration(now)
    })

    this.resizeObs = new ResizeObserver(() => this.layout())
    this.resizeObs.observe(this.el)
    this.layout()
  }

  /** Resolves true only after this call's reels have stopped. A spin already running resolves false. */
  play(result: SpinResult): Promise<boolean> {
    if (this.session.isSpinning || this.reels.length === 0) return Promise.resolve(false)
    const promise = this.session.start(this.reels.length)
    this.pending = result
    this.hurried = false
    this.queue = []
    this.winRows = []
    this.pulseUntil = 0
    this.lines?.clear()
    this.hideCallout()
    const now = performance.now()
    const held = scatterReels(result.grid)
    const base = this.fast ? 700 : 1500
    const step = this.fast ? 120 : 280
    this.reels.forEach((reel, index) => {
      const extra = extraSpinMs(index, held, this.fast)
      reel.spinTo(result.stops[index] ?? 0, base + index * step + extra, now)
    })
    window.clearTimeout(this.watch)
    this.watch = window.setTimeout(() => this.forceFinish(), this.fast ? 6000 : 12000)
    return promise
  }

  hurry(): void {
    this.hurried = true
    const now = performance.now()
    for (const reel of this.reels) reel.slam(now)
    if (!this.celebrating) return
    window.clearTimeout(this.celebrateTimer)
    this.finishSession()
  }

  destroy(): void {
    window.clearTimeout(this.watch)
    window.clearTimeout(this.celebrateTimer)
    this.resizeObs?.disconnect()
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true })
    this.app = null
  }

  private beginCelebration(): void {
    const result = this.pending
    if (!result) {
      this.finishSession()
      return
    }
    this.celebrating = true
    if (result.wins.length > 0) this.showWins(result)
    this.onCelebrate?.(result)
    const big = result.totalWinCents >= result.betCents * 15 && result.totalWinCents > 0
    const perWin = this.fast ? 420 : 780
    const clip = big ? 2200 : result.wins.length > 0 ? 1200 : 0
    const beat = result.wins.length > 0 ? result.wins.length * perWin : this.fast ? 90 : 180
    const hold = this.hurried ? 0 : Math.min(3600, Math.max(clip, beat))
    window.clearTimeout(this.celebrateTimer)
    this.celebrateTimer = window.setTimeout(() => this.finishSession(), hold)
  }

  private finishSession(): void {
    if (!this.session.isSpinning) return
    this.celebrating = false
    window.clearTimeout(this.watch)
    window.clearTimeout(this.celebrateTimer)
    this.pending = null
    this.session.settle()
  }

  private forceFinish(): void {
    if (!this.session.isSpinning) return
    const now = performance.now()
    for (const reel of this.reels) reel.halt(now)
    this.finishSession()
  }

  private showWins(result: SpinResult): void {
    this.queue = result.wins
    this.cursor = 0
    this.cycleAt = performance.now() + (this.fast ? 420 : 780)
    this.pulseUntil = performance.now() + (this.fast ? 1200 : 3600)
    const big = result.totalWinCents >= result.betCents * 15 && result.totalWinCents > 0
    this.applyWin(0, big)
    if (big) this.burstAt = performance.now()
  }

  private applyWin(index: number, big: boolean): void {
    const win = this.queue[index]
    if (!win) return
    this.winRows = this.reels.map(() => new Set<number>())
    for (const pos of win.positions) this.winRows[pos.reel]?.add(pos.row)
    const graphics = this.lines
    if (graphics) {
      graphics.clear()
      if (win.kind === 'line' && win.positions.length >= 2) {
        const color = LINE_COLORS[index % LINE_COLORS.length] ?? 0xffffff
        graphics.lineStyle(6, color, 0.95)
        win.positions.forEach((pos, i) => {
          const point = cellCenter(pos.reel, pos.row)
          if (i === 0) graphics.moveTo(point.x, point.y)
          else graphics.lineTo(point.x, point.y)
        })
      }
    }
    if (this.kicker) this.kicker.visible = false
    if (this.callout) this.callout.visible = false
    void big
  }

  private tickCelebration(now: number): void {
    if (this.queue.length > 1 && now >= this.cycleAt && now < this.pulseUntil) {
      this.cursor = (this.cursor + 1) % this.queue.length
      this.cycleAt = now + (this.fast ? 420 : 780)
      const big = this.kicker?.visible === true
      this.applyWin(this.cursor, big)
    }
    const burst = this.burst
    if (burst && this.burstAt) {
      const p = (now - this.burstAt) / 780
      if (p >= 1) {
        burst.visible = false
        this.burstAt = 0
      } else {
        burst.visible = true
        burst.scale.set(0.4 + p * 2.2)
        burst.alpha = 1 - p
        burst.rotation = p * 0.8
      }
    }
    if (this.pulseUntil && now > this.pulseUntil) this.hideCallout()
  }

  private hideCallout(): void {
    if (this.callout) this.callout.visible = false
    if (this.kicker) this.kicker.visible = false
    this.lines?.clear()
    this.queue = []
    this.winRows = []
  }

  private layout(): void {
    const app = this.app
    const world = this.world
    if (!app || !world) return
    const width = this.el.clientWidth
    const height = this.el.clientHeight
    if (width < 2 || height < 2) return
    app.renderer.resize(width, height)
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H)
    world.scale.set(scale)
    world.position.set((width - DESIGN_W * scale) / 2, (height - DESIGN_H * scale) / 2)
  }
}

async function loadTextures(): Promise<Record<SymbolId, Texture>> {
  const entries = await Promise.all(
    SYMBOL_IDS.map(async (id) => {
      const url = symbolUrls[id]
      if (!url) throw new Error(`missing art for ${id}`)
      const texture = await loadTexture(url)
      return [id, texture] as const
    }),
  )
  return Object.fromEntries(entries) as Record<SymbolId, Texture>
}

function loadTexture(url: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const texture = Texture.from(image)
      texture.baseTexture.scaleMode = SCALE_MODES.LINEAR
      resolve(texture)
    }
    image.onerror = () => reject(new Error(`Could not load symbol ${url}`))
    image.src = url
  })
}
