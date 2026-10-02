import { Application, Container, SCALE_MODES, Texture } from 'pixi.js'
import { symbolUrls } from '../assets/manifest'
import { DESIGN_H, DESIGN_W } from '../game/layout'
import type { SymbolId } from '../shared/types'
import { SYMBOL_IDS } from '../shared/types'
import { CLIPS, type Clip } from './clips'
import { applyTrack, buildTrack, type PlayVars, type TrackNode } from './player'

interface Running {
  clip: Clip
  root: Container
  nodes: TrackNode[]
  t0: number
  vars: PlayVars
}

export type Phase = 'idle' | 'spin' | 'win' | 'feature'

/** Transparent Pixi layer. Clips are timeline data, drawn with the blob sprites. */
export class MotionLayer {
  private app: Application | null = null
  private world: Container | null = null
  private back: Container | null = null
  private front: Container | null = null
  private textures: Partial<Record<SymbolId, Texture>> = {}
  private running: Running[] = []
  private ambient: Running | null = null
  private holdIdleUntil = 0
  private phaseName: Phase = 'idle'
  private resizeObs: ResizeObserver | null = null

  constructor(
    private readonly el: HTMLElement,
    private readonly options: { reduce?: boolean } = {},
  ) {}

  async load(): Promise<void> {
    this.textures = await loadTextures()
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
    const back = new Container()
    const front = new Container()
    world.addChild(back, front)
    app.stage.addChild(world)
    this.world = world
    this.back = back
    this.front = front
    app.ticker.add(() => this.tick(performance.now()))
    this.resizeObs = new ResizeObserver(() => this.layout())
    this.resizeObs.observe(this.el)
    this.layout()
  }

  intro(): void {
    if (this.options.reduce) {
      this.startAmbient()
      return
    }
    this.play('logo-sting')
    window.setTimeout(() => this.startAmbient(), 1500)
  }

  phase(next: Phase): void {
    if (next === 'idle' && performance.now() < this.holdIdleUntil) return
    if (next === this.phaseName) return
    this.phaseName = next
    const clip =
      next === 'spin' ? 'veil-spin' : next === 'win' ? 'veil-win' : next === 'feature' ? 'veil-feature' : 'veil-idle'
    this.play(clip)
  }

  win(cents: number): void {
    this.holdIdleUntil = performance.now() + 1300
    this.phaseName = 'win'
    this.play('win', { amount: cents })
  }

  bigWin(cents: number, title: string): void {
    this.holdIdleUntil = performance.now() + 2300
    this.phaseName = 'win'
    this.play('big-win', { amount: cents, title })
  }

  featureIn(count: number, title: string): void {
    this.holdIdleUntil = performance.now() + 1800
    this.phaseName = 'feature'
    this.play('feature-in', { title, count: String(count) })
  }

  featureOut(title: string): void {
    this.holdIdleUntil = performance.now() + 1500
    this.play('feature-out', { title })
  }

  scatter(hot: boolean): void {
    this.play(hot ? 'scatter-hot' : 'scatter')
  }

  destroy(): void {
    this.resizeObs?.disconnect()
    this.app?.destroy(true, { children: true, texture: true, baseTexture: true })
    this.app = null
  }

  private startAmbient(): void {
    const clip = CLIPS.ambient
    if (this.options.reduce || this.ambient || !this.back || !clip) return
    this.ambient = this.spawn(clip, {}, this.back)
  }

  private play(id: string, vars: PlayVars = {}): void {
    const clip = CLIPS[id]
    if (!clip || !this.front) return
    if (!clip.loop) this.drop(id)
    this.running.push(this.spawn(clip, vars, this.front))
  }

  private spawn(clip: Clip, vars: PlayVars, parent: Container): Running {
    const root = new Container()
    const nodes = clip.tracks.map((track) => {
      const node = buildTrack(track, this.textures, vars)
      root.addChild(node.view)
      return node
    })
    parent.addChild(root)
    const running = { clip, root, nodes, t0: performance.now(), vars }
    this.paint(running, 0)
    return running
  }

  private drop(id: string): void {
    this.running = this.running.filter((item) => {
      if (item.clip.id !== id) return true
      item.root.destroy({ children: true })
      return false
    })
  }

  private tick(now: number): void {
    const paintList = this.ambient ? [this.ambient, ...this.running] : this.running
    for (const item of paintList) {
      const elapsed = now - item.t0
      const t = item.clip.loop ? (elapsed % item.clip.duration) / item.clip.duration : Math.min(1, elapsed / item.clip.duration)
      this.paint(item, t)
    }
    this.running = this.running.filter((item) => {
      if (item.clip.loop) return true
      if (now - item.t0 < item.clip.duration) return true
      item.root.destroy({ children: true })
      return false
    })
  }

  private paint(item: Running, t: number): void {
    for (const node of item.nodes) applyTrack(node, t, item.vars.amount ?? 0)
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

async function loadTextures(): Promise<Partial<Record<SymbolId, Texture>>> {
  const entries = await Promise.all(
    SYMBOL_IDS.map(async (id) => {
      const url = symbolUrls[id]
      if (!url) return null
      const image = new Image()
      image.src = url
      await image.decode()
      const texture = Texture.from(image)
      texture.baseTexture.scaleMode = SCALE_MODES.LINEAR
      return [id, texture] as const
    }),
  )
  return Object.fromEntries(entries.filter((entry): entry is readonly [SymbolId, Texture] => entry !== null))
}
