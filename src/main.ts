import '@fontsource/outfit/400.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/800.css'
import '../shell/styles.css'
import { SlotGame } from '../game/SlotGame'
import { DemoHost } from '../host/DemoHost'
import { mulberry32 } from '../host/rng'
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
shell.setHurry(() => game.hurry())
shell.onTurbo = (on) => game.setFast(on || reduceMotion)
game.onReelStop = () => shell.tick()

host.on('spinStart', ({ result }) => {
  game.play(result).then(
    () => host.completePresentation(),
    (error: unknown) => {
      console.error(error)
      host.completePresentation()
    },
  )
})

void game.load(host.launch().strips).then(
  () => shell.setReady(),
  (error: unknown) => {
    console.error(error)
    const webgl = error instanceof Error && /renderer|webgl/i.test(error.message)
    shell.setError(webgl ? 'webgl' : 'load')
  },
)
