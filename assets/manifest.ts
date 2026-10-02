import type { SymbolId } from '../shared/types'
import l1 from './symbols/l1-drop.svg?url'
import l2 from './symbols/l2-blob.svg?url'
import l3 from './symbols/l3-squircle.svg?url'
import l4 from './symbols/l4-bean.svg?url'
import m1 from './symbols/m1-hex.svg?url'
import m2 from './symbols/m2-gem.svg?url'
import h1 from './symbols/h1-clover.svg?url'
import wild from './symbols/wild.svg?url'
import scatter from './symbols/scatter.svg?url'
import hero from './brand/hero-chars.svg?url'
import blob from './brand/blob.svg?url'
import cloud from './brand/cloud.svg?url'
import click from './audio/click.wav?url'
import stop from './audio/stop.wav?url'
import spin from './audio/spin.wav?url'
import win from './audio/win.wav?url'
import bigwin from './audio/bigwin.wav?url'
import feature from './audio/feature.wav?url'
import tease from './audio/tease.wav?url'

export const symbolUrls: Record<SymbolId, string> = {
  l1,
  l2,
  l3,
  l4,
  m1,
  m2,
  h1,
  wild,
  scatter,
}

export const brandUrls = { hero, blob, cloud }

export const audioUrls = { click, stop, spin, win, bigwin, feature, tease }
