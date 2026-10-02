import { Application, Container, Graphics, SCALE_MODES, Texture } from 'pixi.js'
import type { SpinResult, SymbolId } from '../shared/types'
import { SYMBOL_IDS } from '../shared/types'
import { symbolUrls } from '../assets/manifest'
import { CELL, DESIGN_H, DESIGN_W, GAP, ORIGIN_X, ORIGIN_Y, REEL_COUNT, cellCenter } from './layout'
import { ReelView } from './ReelView'

const LINE_COLORS = [0xff4d6a, 0xffb000, 0x14c48a, 0x3aa0ff, 0xb072f0]

export class SlotGame {
  private app: Application | null = null
  private world: Container | null = null
  private lines: Graphics | null = null
  private reels: ReelView[] = []
  private winRows: Array<Set<number> | null> = []
  private pulseUntil = 0
  private playing = false
  private hurried = false
  private landed = 0
  private fast: boolean
  private resolvePlay: (() => void) | null = null
  private releaseHold: (() => void) | null = null
  private resizeObs: ResizeObserver | null = null

  onReelStop: (() => void) | null = null

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
      [DESIGN_W - 18, 20, 0x22c55e],
      [18, DESIGN_H - 16, 0x3b82f6],
      [DESIGN_W - 20, DESIGN_H - 18, 0xff4fa3],
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
    world.addChild(this.lines)

    app.ticker.add(() => {
      const now = performance.now()
      const pulse = now < this.pulseUntil
      for (const [index, reel] of this.reels.entries()) {
        const landed = reel.update(now, this.winRows[index] ?? null, pulse)
        if (landed) this.onLanded()
      }
    })

    this.resizeObs = new ResizeObserver(() => this.layout())
    this.resizeObs.observe(this.el)
    this.layout()
  }

  play(result: SpinResult): Promise<void> {
    if (this.playing || this.reels.length === 0) return Promise.resolve()
    this.playing = true
    this.hurried = false
    this.landed = 0
    this.winRows = []
    this.pulseUntil = 0
    this.lines?.clear()
    const now = performance.now()
    const base = this.fast ? 460 : 960
    const step = this.fast ? 70 : 180
    this.reels.forEach((reel, index) => {
      const stop = result.stops[index] ?? 0
      reel.spinTo(stop, base + index * step, now)
    })
    return new Promise((resolve) => {
    this.resolvePlay = () => {
      this.playing = false
      resolve()
    }
      this.pending = result
    })
  }

  hurry(): void {
    this.hurried = true
    const now = performance.now()
    for (const reel of this.reels) reel.slam(now)
    this.releaseHold?.()
  }

  destroy(): void {
    this.resizeObs?.disconnect()
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true })
    this.app = null
  }

  private pending: SpinResult | null = null

  private onLanded(): void {
    this.landed += 1
    this.onReelStop?.()
    if (this.landed < this.reels.length) return
    const result = this.pending
    this.pending = null
    if (!result) return
    if (result.wins.length > 0) this.showWins(result)
    const hold = this.hurried ? 0 : result.wins.length > 0 ? (this.fast ? 700 : 1400) : this.fast ? 80 : 160
    void this.hold(hold).then(() => this.resolvePlay?.())
  }

  private showWins(result: SpinResult): void {
    this.winRows = this.reels.map(() => new Set<number>())
    for (const win of result.wins) {
      for (const pos of win.positions) {
        this.winRows[pos.reel]?.add(pos.row)
      }
    }
    this.pulseUntil = performance.now() + (this.fast ? 900 : 2400)
    const graphics = this.lines
    if (!graphics) return
    graphics.clear()
    let colorIndex = 0
    for (const win of result.wins) {
      if (win.kind !== 'line' || win.positions.length < 2) continue
      const color = LINE_COLORS[colorIndex % LINE_COLORS.length] ?? 0xffffff
      colorIndex += 1
      graphics.lineStyle(5, color, 0.92)
      win.positions.forEach((pos, index) => {
        const point = cellCenter(pos.reel, pos.row)
        if (index === 0) graphics.moveTo(point.x, point.y)
        else graphics.lineTo(point.x, point.y)
      })
    }
  }

  private hold(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve()
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.releaseHold = null
        resolve()
      }, ms)
      this.releaseHold = () => {
        window.clearTimeout(timer)
        this.releaseHold = null
        resolve()
      }
    })
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
