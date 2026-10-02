import type { SymbolId } from '../shared/types'

export type EaseName = 'linear' | 'outCubic' | 'outBack' | 'inOut'

export interface Keyframe {
  t: number
  x?: number
  y?: number
  scale?: number
  rotation?: number
  alpha?: number
  ease?: EaseName
}

export type TrackKind = 'sprite' | 'text' | 'counter' | 'ring' | 'veil' | 'plate'

export interface Track {
  id: string
  kind: TrackKind
  symbol?: SymbolId
  text?: string
  color?: number
  fontSize?: number
  width?: number
  height?: number
  keys: Keyframe[]
}

export interface Clip {
  id: string
  duration: number
  loop?: boolean
  tracks: Track[]
}

const CX = 400
const CY = 224

export const CLIPS: Record<string, Clip> = {
  'logo-sting': {
    id: 'logo-sting',
    duration: 1500,
    tracks: [
      sprite('l2', [
        { t: 0, x: 180, y: 300, scale: 0.1, alpha: 0 },
        { t: 0.35, x: 250, y: 250, scale: 0.72, alpha: 1, ease: 'outBack' },
        { t: 0.75, x: 250, y: 250, scale: 0.66, alpha: 1 },
        { t: 1, x: 220, y: 280, scale: 0.4, alpha: 0, ease: 'inOut' },
      ]),
      sprite('h1', [
        { t: 0, x: 620, y: 80, scale: 0.1, alpha: 0 },
        { t: 0.42, x: 540, y: 250, scale: 0.78, alpha: 1, ease: 'outBack' },
        { t: 0.78, x: 540, y: 250, scale: 0.7, alpha: 1 },
        { t: 1, x: 580, y: 200, scale: 0.4, alpha: 0 },
      ]),
      sprite('wild', [
        { t: 0.1, x: CX, y: 40, scale: 0.2, alpha: 0 },
        { t: 0.48, x: CX, y: 150, scale: 0.62, alpha: 1, ease: 'outBack' },
        { t: 0.8, x: CX, y: 150, scale: 0.55, alpha: 1 },
        { t: 1, x: CX, y: 120, scale: 0.3, alpha: 0 },
      ]),
      plate(300, 96, [
        { t: 0.16, x: CX, y: 232, scale: 0.5, alpha: 0 },
        { t: 0.4, x: CX, y: 230, scale: 1, alpha: 1, ease: 'outBack' },
        { t: 0.78, x: CX, y: 230, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 220, scale: 0.92, alpha: 0 },
      ]),
      text('GROK', 64, [
        { t: 0.18, x: CX, y: 250, scale: 0.4, alpha: 0 },
        { t: 0.4, x: CX, y: 230, scale: 1.12, alpha: 1, ease: 'outBack' },
        { t: 0.78, x: CX, y: 230, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 220, scale: 0.9, alpha: 0 },
      ]),
    ],
  },
  ambient: {
    id: 'ambient',
    duration: 5200,
    loop: true,
    tracks: [
      sprite('l1', drift(70, 70, 110, 36, 0.28)),
      sprite('m2', drift(720, 60, 680, 90, 0.22)),
      sprite('l3', drift(60, 380, 100, 340, 0.2)),
      sprite('wild', drift(730, 390, 690, 350, 0.18)),
    ],
  },
  'veil-spin': veil(0x171513, 420),
  'veil-idle': veil(0xfffdf8, 380),
  'veil-win': veil(0xff4d8d, 460),
  'veil-feature': veil(0x14c48a, 520),
  scatter: {
    id: 'scatter',
    duration: 780,
    tracks: [
      ring(0x0086ff, [
        { t: 0, x: CX, y: CY, scale: 0.2, alpha: 0.9 },
        { t: 1, x: CX, y: CY, scale: 1.6, alpha: 0, ease: 'outCubic' },
      ]),
      sprite('scatter', [
        { t: 0, x: CX, y: CY, scale: 0.4, alpha: 0 },
        { t: 0.35, x: CX, y: CY, scale: 1.05, alpha: 1, ease: 'outBack' },
        { t: 1, x: CX, y: CY - 20, scale: 0.7, alpha: 0 },
      ]),
    ],
  },
  'scatter-hot': {
    id: 'scatter-hot',
    duration: 1100,
    tracks: [
      ring(0xff009d, [
        { t: 0, x: CX, y: CY, scale: 0.15, alpha: 1 },
        { t: 1, x: CX, y: CY, scale: 2.1, alpha: 0, ease: 'outCubic' },
      ]),
      ring(0x0086ff, [
        { t: 0.15, x: CX, y: CY, scale: 0.2, alpha: 0.8 },
        { t: 1, x: CX, y: CY, scale: 1.5, alpha: 0 },
      ]),
      sprite('scatter', [
        { t: 0, x: 220, y: CY, scale: 0.3, alpha: 0, rotation: -0.4 },
        { t: 0.4, x: 300, y: CY - 10, scale: 0.9, alpha: 1, rotation: 0, ease: 'outBack' },
        { t: 1, x: 280, y: CY - 30, scale: 0.6, alpha: 0 },
      ]),
      sprite('scatter', [
        { t: 0, x: 580, y: CY, scale: 0.3, alpha: 0, rotation: 0.4 },
        { t: 0.45, x: 500, y: CY - 10, scale: 0.9, alpha: 1, rotation: 0, ease: 'outBack' },
        { t: 1, x: 520, y: CY - 30, scale: 0.6, alpha: 0 },
      ]),
    ],
  },
  win: {
    id: 'win',
    duration: 1200,
    tracks: [
      ring(0xffb000, [
        { t: 0, x: CX, y: CY, scale: 0.3, alpha: 0.85 },
        { t: 1, x: CX, y: CY, scale: 1.35, alpha: 0, ease: 'outCubic' },
      ]),
      sprite('h1', pop(CX - 120, CY + 10, 0.15)),
      sprite('m1', pop(CX + 120, CY + 16, 0.22)),
      plate(280, 78, [
        { t: 0, x: CX, y: CY - 6, scale: 0.6, alpha: 0 },
        { t: 0.28, x: CX, y: CY - 8, scale: 1.08, alpha: 1, ease: 'outBack' },
        { t: 0.82, x: CX, y: CY - 8, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: CY - 20, scale: 0.94, alpha: 0 },
      ]),
      counter(54, [
        { t: 0, x: CX, y: CY + 8, scale: 0.55, alpha: 0 },
        { t: 0.28, x: CX, y: CY - 8, scale: 1.2, alpha: 1, ease: 'outBack' },
        { t: 0.8, x: CX, y: CY - 8, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: CY - 24, scale: 0.92, alpha: 0 },
      ]),
    ],
  },
  'big-win': {
    id: 'big-win',
    duration: 2200,
    tracks: [
      {
        id: 'wash',
        kind: 'veil',
        color: 0xfffdf8,
        keys: [
          { t: 0, alpha: 0 },
          { t: 0.12, alpha: 0.78, ease: 'outCubic' },
          { t: 0.72, alpha: 0.72 },
          { t: 1, alpha: 0 },
        ],
      },
      sprite('l2', celebrate(150, 300, 0)),
      sprite('h1', celebrate(250, 120, 0.08)),
      sprite('wild', celebrate(560, 110, 0.12)),
      sprite('scatter', celebrate(660, 300, 0.05)),
      plate(340, 132, [
        { t: 0.06, x: CX, y: 176, scale: 0.7, alpha: 0 },
        { t: 0.3, x: CX, y: 168, scale: 1.06, alpha: 1, ease: 'outBack' },
        { t: 0.78, x: CX, y: 168, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 160, scale: 0.95, alpha: 0 },
      ]),
      text('BIG WIN', 28, [
        { t: 0.08, x: CX, y: 150, scale: 0.6, alpha: 0 },
        { t: 0.32, x: CX, y: 132, scale: 1.15, alpha: 1, ease: 'outBack' },
        { t: 0.75, x: CX, y: 132, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 120, scale: 0.9, alpha: 0 },
      ], 'title'),
      counter(72, [
        { t: 0.18, x: CX, y: 210, scale: 0.4, alpha: 0 },
        { t: 0.42, x: CX, y: 200, scale: 1.18, alpha: 1, ease: 'outBack' },
        { t: 0.8, x: CX, y: 200, scale: 1.05, alpha: 1 },
        { t: 1, x: CX, y: 190, scale: 0.9, alpha: 0 },
      ]),
    ],
  },
  'feature-in': {
    id: 'feature-in',
    duration: 1700,
    tracks: [
      {
        id: 'wash',
        kind: 'veil',
        color: 0xe8fff3,
        keys: [
          { t: 0, alpha: 0 },
          { t: 0.15, alpha: 0.88, ease: 'outCubic' },
          { t: 0.7, alpha: 0.82 },
          { t: 1, alpha: 0 },
        ],
      },
      sprite('scatter', celebrate(180, 280, 0)),
      sprite('h1', celebrate(400, 300, 0.1)),
      sprite('wild', celebrate(620, 280, 0.05)),
      text('', 22, [
        { t: 0.12, x: CX, y: 150, scale: 0.7, alpha: 0 },
        { t: 0.38, x: CX, y: 140, scale: 1.08, alpha: 1, ease: 'outBack' },
        { t: 0.75, x: CX, y: 140, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 130, scale: 0.95, alpha: 0 },
      ]),
      text('', 68, [
        { t: 0.2, x: CX, y: 210, scale: 0.3, alpha: 0 },
        { t: 0.48, x: CX, y: 200, scale: 1.2, alpha: 1, ease: 'outBack' },
        { t: 0.78, x: CX, y: 200, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 190, scale: 0.85, alpha: 0 },
      ], 'count'),
    ],
  },
  'feature-out': {
    id: 'feature-out',
    duration: 1400,
    tracks: [
      {
        id: 'wash',
        kind: 'veil',
        color: 0xfffdf8,
        keys: [
          { t: 0, alpha: 0 },
          { t: 0.18, alpha: 0.8 },
          { t: 0.7, alpha: 0.55 },
          { t: 1, alpha: 0 },
        ],
      },
      sprite('l2', pop(CX - 70, 200, 0.1)),
      sprite('h1', pop(CX + 70, 210, 0.16)),
      text('', 32, [
        { t: 0.1, x: CX, y: 180, scale: 0.8, alpha: 0 },
        { t: 0.4, x: CX, y: 168, scale: 1.05, alpha: 1, ease: 'outCubic' },
        { t: 0.75, x: CX, y: 168, scale: 1, alpha: 1 },
        { t: 1, x: CX, y: 160, scale: 0.95, alpha: 0 },
      ]),
    ],
  },
}

function sprite(symbol: SymbolId, keys: Keyframe[]): Track {
  return { id: symbol + keys.length, kind: 'sprite', symbol, keys }
}

function text(value: string, fontSize: number, keys: Keyframe[], id = value || 'title'): Track {
  return { id, kind: 'text', text: value, fontSize, color: 0x171513, keys }
}

function plate(width: number, height: number, keys: Keyframe[]): Track {
  return { id: 'plate', kind: 'plate', width, height, color: 0xfffdf8, keys }
}

function counter(fontSize: number, keys: Keyframe[]): Track {
  return { id: 'amount', kind: 'counter', fontSize, color: 0x171513, keys }
}

function ring(color: number, keys: Keyframe[]): Track {
  return { id: `ring-${color}`, kind: 'ring', color, keys }
}

function veil(color: number, duration: number): Clip {
  return {
    id: `veil-${color}`,
    duration,
    tracks: [
      {
        id: 'wash',
        kind: 'veil',
        color,
        keys: [
          { t: 0, alpha: 0 },
          { t: 0.25, alpha: 0.28, ease: 'outCubic' },
          { t: 1, alpha: 0 },
        ],
      },
    ],
  }
}

function pop(x: number, y: number, delay: number): Keyframe[] {
  return [
    { t: delay, x, y: y + 20, scale: 0.2, alpha: 0 },
    { t: delay + 0.28, x, y, scale: 0.7, alpha: 1, ease: 'outBack' },
    { t: 0.75, x, y, scale: 0.62, alpha: 1 },
    { t: 1, x, y: y - 16, scale: 0.4, alpha: 0 },
  ]
}

function celebrate(x: number, y: number, delay: number): Keyframe[] {
  return [
    { t: delay, x, y: y + 40, scale: 0.2, alpha: 0, rotation: -0.2 },
    { t: delay + 0.3, x, y, scale: 0.78, alpha: 1, rotation: 0.05, ease: 'outBack' },
    { t: 0.7, x, y: y - 8, scale: 0.72, alpha: 1, rotation: -0.04 },
    { t: 1, x, y: y - 24, scale: 0.5, alpha: 0 },
  ]
}

function drift(x0: number, y0: number, x1: number, y1: number, scale: number): Keyframe[] {
  return [
    { t: 0, x: x0, y: y0, scale, alpha: 0.45 },
    { t: 0.5, x: x1, y: y1, scale: scale + 0.06, alpha: 0.7, ease: 'inOut' },
    { t: 1, x: x0, y: y0, scale, alpha: 0.45 },
  ]
}

export const CLIP_IDS = Object.keys(CLIPS)
