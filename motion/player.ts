import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import type { SymbolId } from '../shared/types'
import { formatCredits } from '../shared/types'
import { DESIGN_H, DESIGN_W } from '../game/layout'
import type { EaseName, Keyframe, Track } from './clips'

export interface PlayVars {
  amount?: number
  title?: string
  count?: string
}

export interface TrackNode {
  track: Track
  view: Container
  text?: Text
  shown?: number
}

export function ease(name: EaseName | undefined, t: number): number {
  const u = Math.min(1, Math.max(0, t))
  if (name === 'outCubic') return 1 - (1 - u) ** 3
  if (name === 'inOut') return u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2
  if (name === 'outBack') {
    const c = 1.35
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2
  }
  return u
}

export function sample(keys: readonly Keyframe[], t: number): Required<Omit<Keyframe, 'ease'>> {
  const first = keys[0]
  const last = keys[keys.length - 1]
  if (!first || !last) return { t, x: 0, y: 0, scale: 1, rotation: 0, alpha: 1 }
  let prev = first
  let next = last
  for (const key of keys) {
    if (key.t <= t) prev = key
    if (key.t >= t) {
      next = key
      break
    }
  }
  const span = next.t - prev.t
  const u = span <= 0 ? 1 : ease(next.ease ?? prev.ease, (t - prev.t) / span)
  return {
    t,
    x: lerp(prev.x, next.x, u, 0),
    y: lerp(prev.y, next.y, u, 0),
    scale: lerp(prev.scale, next.scale, u, 1),
    rotation: lerp(prev.rotation, next.rotation, u, 0),
    alpha: lerp(prev.alpha, next.alpha, u, 1),
  }
}

function lerp(a: number | undefined, b: number | undefined, u: number, fallback: number): number {
  const from = a ?? b ?? fallback
  const to = b ?? a ?? fallback
  return from + (to - from) * u
}

export function buildTrack(
  track: Track,
  textures: Partial<Record<SymbolId, Texture>>,
  vars: PlayVars,
): TrackNode {
  const view = new Container()
  let text: Text | undefined
  if (track.kind === 'sprite' && track.symbol) {
    const texture = textures[track.symbol]
    if (texture) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const base = 108 / (texture.width || 1)
      sprite.scale.set(base)
      view.addChild(sprite)
    }
  } else if (track.kind === 'ring') {
    const ring = new Graphics()
    ring.lineStyle(8, track.color ?? 0xffffff, 1)
    ring.drawCircle(0, 0, 70)
    view.addChild(ring)
  } else if (track.kind === 'plate') {
    const plate = new Graphics()
    const w = track.width ?? 260
    const h = track.height ?? 72
    plate.beginFill(track.color ?? 0xfffdf8)
    plate.drawRoundedRect(-w / 2, -h / 2, w, h, 22)
    plate.endFill()
    view.addChild(plate)
  } else if (track.kind === 'veil') {
    const veil = new Graphics()
    veil.beginFill(track.color ?? 0xffffff)
    veil.drawRect(0, 0, DESIGN_W, DESIGN_H)
    veil.endFill()
    view.addChild(veil)
  } else {
    const value = track.kind === 'counter' ? '+0.00' : track.id === 'count' ? (vars.count ?? '') : track.id === 'title' ? (vars.title ?? track.text ?? '') : (track.text ?? '')
    text = new Text(
      value,
      new TextStyle({
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontWeight: '800',
        fontSize: track.fontSize ?? 42,
        fill: track.color ?? 0x171513,
        align: 'center',
      }),
    )
    text.anchor.set(0.5)
    text.resolution = 2
    view.addChild(text)
  }
  return { track, view, text }
}

export function applyTrack(node: TrackNode, t: number, amount = 0): void {
  const frame = sample(node.track.keys, t)
  node.view.position.set(frame.x, frame.y)
  node.view.scale.set(frame.scale)
  node.view.rotation = frame.rotation
  node.view.alpha = frame.alpha
  if (node.track.kind === 'counter' && node.text) {
    const shown = Math.round(amount * ease('outCubic', t))
    node.text.text = `+${formatCredits(shown)}`
    if (shown !== node.shown) {
      node.shown = shown
      node.view.scale.set(frame.scale * 1.08)
    }
  }
}
