import '@fontsource/outfit/400.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/800.css'
import '../shell/styles.css'
import { SlotGame } from '../game/SlotGame'
import { DemoHost } from '../host/DemoHost'
import { mulberry32 } from '../host/rng'
import { MotionLayer } from '../motion/MotionLayer'
import { Shell } from '../shell/Shell'
import type { Lang } from '../shell/i18n'

const params = new URLSearchParams(location.search)
const seedRaw = params.get('seed')
const rng =
  seedRaw !== null && seedRaw !== '' && Number.isFinite(Number(seedRaw))
    ? mulberry32(Number(seedRaw))
    : Math.random

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const lang: Lang = params.get('lang') === 'es' ? 'es' : 'en'
const host = new DemoHost({ rng })
const force = params.get('force')
if (force === 'scatter' || force === 'line') host.armForce(force)

const root = document.querySelector('#app')
if (!(root instanceof HTMLElement)) throw new Error('missing #app')

const shell = new Shell(root, host, { lang, reduceMotion })
const game = new SlotGame(shell.stageEl, { fast: reduceMotion })
const motion = new MotionLayer(shell.motionEl, { reduce: reduceMotion })
shell.setHurry(() => game.hurry())
shell.onTurbo = (on) => game.setFast(on || reduceMotion)

let scattersThisSpin = 0
game.onReelStop = (symbols) => {
  shell.tick(symbols)
  const landed = symbols.filter((symbol) => symbol === 'scatter').length
  if (landed === 0) return
  scattersThisSpin += landed
  motion.scatter(scattersThisSpin >= 2)
}

host.on('spinStart', ({ result }) => {
  scattersThisSpin = 0
  motion.phase('spin')
  game.play(result).then(
    (shown) => {
      if (shown) host.completePresentation()
    },
    (error: unknown) => {
      console.error(error)
      host.completePresentation()
    },
  )
})

game.onCelebrate = (result) => {
  if (result.totalWinCents <= 0) return
  const big = result.totalWinCents >= result.betCents * 15
  if (big) motion.bigWin(result.totalWinCents, shell.copy('bigWin'))
  else motion.win(result.totalWinCents)
}

host.on('featureStart', ({ awarded }) => {
  motion.featureIn(awarded, shell.copy('freeSpins'))
})

host.on('featureEnd', () => {
  motion.featureOut(shell.copy('featureEnd'))
})

host.on('spinStop', () => {
  motion.phase(host.snapshot.freeSpinsRemaining > 0 ? 'feature' : 'idle')
})

void Promise.all([
  game.load(host.launch().strips),
  motion.load().catch((error: unknown) => {
    console.error(error)
  }),
]).then(
  () => {
    shell.setReady()
    motion.intro()
  },
  (error: unknown) => {
    console.error(error)
    const webgl = error instanceof Error && /renderer|webgl/i.test(error.message)
    shell.setError(webgl ? 'webgl' : 'load')
  },
)
