import { brandUrls, symbolUrls } from '../assets/manifest'
import type { DemoHost } from '../host/DemoHost'
import { formatCredits, SYMBOL_IDS, SYMBOL_TIER, type OfAKind, type SymbolId } from '../shared/types'
import { AudioBus } from './audio'
import { createI18n, type I18n, type Lang } from './i18n'

export class Shell {
  readonly stageEl: HTMLElement
  onTurbo: ((on: boolean) => void) | null = null

  private i18n: I18n
  private readonly audio = new AudioBus()
  private hurry: (() => void) | null = null
  private autoLeft = 0
  private timer = 0
  private ready = false
  private turbo: boolean
  private roundId = ''
  private winCents = 0
  private armed = false
  private readonly launch: ReturnType<DemoHost['launch']>

  private readonly balanceEl: HTMLElement
  private readonly winEl: HTMLElement
  private readonly betEl: HTMLElement
  private readonly linesEl: HTMLElement
  private readonly spinButton: HTMLButtonElement
  private readonly betDown: HTMLButtonElement
  private readonly betUp: HTMLButtonElement
  private readonly autoSelect: HTMLSelectElement
  private readonly turboButton: HTMLButtonElement
  private readonly soundButton: HTMLButtonElement
  private readonly previewButton: HTMLButtonElement
  private readonly loadingEl: HTMLElement
  private readonly bannerEl: HTMLElement
  private readonly fineEl: HTMLElement
  private readonly toastEl: HTMLElement
  private readonly modalEl: HTMLElement
  private readonly payList: HTMLElement
  private readonly payExtra: HTMLElement
  private readonly langSelect: HTMLSelectElement

  constructor(
    private readonly root: HTMLElement,
    private readonly host: DemoHost,
    options: { lang: Lang; reduceMotion: boolean },
  ) {
    this.i18n = createI18n(options.lang)
    this.turbo = options.reduceMotion
    this.launch = host.launch()
    this.root.className = 'app'
    this.root.innerHTML = TEMPLATE
    document.documentElement.lang = options.lang

    this.stageEl = this.must('[data-stage]')
    this.balanceEl = this.must('[data-balance]')
    this.winEl = this.must('[data-win]')
    this.betEl = this.must('[data-bet-value]')
    this.linesEl = this.must('[data-lines]')
    this.spinButton = this.must('[data-spin]')
    this.betDown = this.must('[data-bet="down"]')
    this.betUp = this.must('[data-bet="up"]')
    this.autoSelect = this.must('[data-auto]')
    this.turboButton = this.must('[data-turbo]')
    this.soundButton = this.must('[data-sound]')
    this.previewButton = this.must('[data-preview]')
    this.loadingEl = this.must('[data-loading]')
    this.bannerEl = this.must('[data-banner]')
    this.fineEl = this.must('[data-fine]')
    this.toastEl = this.must('[data-toast]')
    this.modalEl = this.must('[data-modal]')
    this.payList = this.must('[data-pay-list]')
    this.payExtra = this.must('[data-pay-extra]')
    this.langSelect = this.must('[data-lang]')

    this.must<HTMLImageElement>('[data-blob]').src = brandUrls.blob
    this.must<HTMLImageElement>('[data-cloud]').src = brandUrls.cloud
    this.must<HTMLImageElement>('[data-hero]').src = brandUrls.hero
    this.must<HTMLImageElement>('[data-sheet-hero]').src = brandUrls.hero
    this.langSelect.value = options.lang
    this.fillAuto()
    this.renderTexts()
    this.renderDynamic()
    this.bind()
    this.listen()
  }

  setHurry(handler: () => void): void {
    this.hurry = handler
  }

  setReady(): void {
    this.ready = true
    this.loadingEl.hidden = true
    this.renderDynamic()
  }

  setError(kind: 'load' | 'webgl' = 'load'): void {
    this.loadingEl.hidden = false
    this.loadingEl.textContent = this.i18n.t(kind === 'webgl' ? 'webglError' : 'loadError')
  }

  tick(): void {
    this.audio.play('stop')
  }

  private bind(): void {
    this.spinButton.addEventListener('click', () => this.onSpinClick())
    this.betDown.addEventListener('click', () => this.stepBet(-1))
    this.betUp.addEventListener('click', () => this.stepBet(1))
    this.autoSelect.addEventListener('change', () => {
      this.autoLeft = Number(this.autoSelect.value) || 0
      this.audio.unlock()
      if (this.autoLeft > 0) this.kick()
    })
    this.turboButton.addEventListener('click', () => {
      this.turbo = !this.turbo
      this.audio.play('click')
      this.onTurbo?.(this.turbo)
      this.renderTexts()
    })
    this.soundButton.addEventListener('click', () => {
      this.audio.unlock()
      const muted = this.audio.toggle()
      if (!muted) this.audio.play('click')
      this.renderTexts()
    })
    this.must('[data-pay]').addEventListener('click', () => this.openPaytable())
    this.previewButton.addEventListener('click', () => this.preview())
    this.must('[data-close]').addEventListener('click', () => this.closeModal())
    this.modalEl.addEventListener('click', () => this.closeModal())
    this.must('[data-sheet]').addEventListener('click', (event) => event.stopPropagation())
    this.langSelect.addEventListener('change', () => {
      const next: Lang = this.langSelect.value === 'es' ? 'es' : 'en'
      this.i18n = createI18n(next)
      document.documentElement.lang = next
      this.fillAuto()
      this.renderTexts()
      this.renderDynamic()
    })
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.closeModal()
      if (event.code !== 'Space') return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'SELECT' || tag === 'BUTTON' || tag === 'INPUT') return
      event.preventDefault()
      this.onSpinClick()
    })
  }

  private listen(): void {
    this.host.on('balanceUpdate', () => this.renderDynamic())
    this.host.on('spinStart', ({ result, freeSpin }) => {
      this.winCents = 0
      this.roundId = result.roundId
      this.armed = false
      this.audio.play('spin')
      if (freeSpin) this.banner(this.i18n.t('freeSpins'))
      else this.bannerEl.hidden = true
      this.renderDynamic()
    })
    this.host.on('spinStop', () => {
      const remaining = this.host.snapshot.freeSpinsRemaining
      if (remaining > 0) this.banner(this.i18n.t('freeLeft', { n: remaining }))
      this.renderDynamic()
      window.clearTimeout(this.timer)
      const delay = this.turbo ? 260 : 460
      this.timer = window.setTimeout(() => {
        if (this.autoLeft > 0 || this.host.snapshot.freeSpinsRemaining > 0) this.kick()
      }, delay)
    })
    this.host.on('win', ({ totalWinCents }) => {
      this.winCents = totalWinCents
      const big = totalWinCents >= this.host.snapshot.betCents * 15
      this.audio.play(big ? 'bigwin' : 'win')
      this.renderDynamic()
      this.winEl.classList.remove('pop')
      void this.winEl.offsetWidth
      this.winEl.classList.add('pop')
    })
    this.host.on('featureStart', ({ awarded }) => {
      this.audio.play('feature')
      this.banner(this.i18n.t('awarded', { n: awarded }))
    })
    this.host.on('featureEnd', ({ totalWinCents }) => {
      this.toast(`${this.i18n.t('featureEnd')} · ${this.money(totalWinCents)}`)
    })
    this.host.on('rejected', ({ reason }) => {
      if (reason !== 'insufficient') return
      this.autoLeft = 0
      this.autoSelect.value = '0'
      this.toast(this.i18n.t('insufficient'))
      this.renderDynamic()
    })
  }

  private onSpinClick(): void {
    this.audio.unlock()
    if (!this.ready) return
    if (this.host.snapshot.busy) {
      this.autoLeft = 0
      this.autoSelect.value = '0'
      this.hurry?.()
      this.renderDynamic()
      return
    }
    this.kick()
  }

  private kick(): void {
    if (!this.ready || this.host.snapshot.busy) return
    const free = this.host.snapshot.freeSpinsRemaining > 0
    void this.host.spin().then((ok) => {
      if (!ok) return
      if (!free && this.autoLeft > 0) {
        this.autoLeft -= 1
        if (this.autoLeft === 0) this.autoSelect.value = '0'
      }
      this.renderDynamic()
    })
  }

  private stepBet(direction: number): void {
    this.audio.play('click')
    this.host.setBetIndex(this.host.snapshot.betIndex + direction)
    this.renderDynamic()
  }

  private preview(): void {
    this.audio.unlock()
    this.host.armForce('scatter')
    if (this.host.snapshot.busy || !this.ready) {
      this.armed = true
      this.renderDynamic()
      return
    }
    this.kick()
  }

  private openPaytable(): void {
    this.fillPaytable()
    this.modalEl.hidden = false
  }

  private closeModal(): void {
    this.modalEl.hidden = true
  }

  private fillAuto(): void {
    const selected = this.autoLeft > 0 ? String(this.autoLeft) : '0'
    this.autoSelect.replaceChildren()
    const choices: Array<[string, string]> = [
      ['0', this.i18n.t('off')],
      ['10', '10'],
      ['25', '25'],
      ['50', '50'],
    ]
    if (!choices.some(([value]) => value === selected)) choices.push([selected, selected])
    for (const [value, label] of choices) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = label
      this.autoSelect.append(option)
    }
    this.autoSelect.value = selected
  }

  private fillPaytable(): void {
    const bet = this.host.snapshot.betCents
    const lineBet = bet / this.launch.lines.length
    this.payExtra.textContent = `${this.i18n.t('freeSpins')} 3 / 4 / 5 · ${this.launch.freeSpins.three} / ${this.launch.freeSpins.four} / ${this.launch.freeSpins.five}`
    this.payList.replaceChildren()
    for (const id of SYMBOL_IDS) {
      const row = document.createElement('div')
      row.className = 'pay-row'
      const image = document.createElement('img')
      image.src = symbolUrls[id] ?? ''
      image.alt = ''
      const name = document.createElement('div')
      name.className = 'pay-name'
      const title = document.createElement('strong')
      title.textContent = this.i18n.t(`sym.${id}`)
      const tier = document.createElement('span')
      tier.textContent = this.i18n.t(`tier.${SYMBOL_TIER[id]}`)
      name.append(title, tier)
      const values = document.createElement('div')
      values.className = 'pay-values'
      const table = payOf(id, this.launch.linePays, this.launch.scatterPay)
      const basis = id === 'scatter' ? bet : lineBet
      for (const [count, mult] of [
        ['3', table.three],
        ['4', table.four],
        ['5', table.five],
      ] as const) {
        const cell = document.createElement('span')
        cell.textContent = `${count} · ${this.money(mult * basis)}`
        values.append(cell)
      }
      row.append(image, name, values)
      this.payList.append(row)
    }
  }

  private renderTexts(): void {
    this.root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n
      if (key) node.textContent = this.i18n.t(key)
    })
    this.turboButton.textContent = this.turbo ? this.i18n.t('turboOn') : this.i18n.t('turbo')
    this.turboButton.setAttribute('aria-pressed', String(this.turbo))
    this.soundButton.textContent = this.audio.isMuted ? this.i18n.t('soundOff') : this.i18n.t('sound')
    this.soundButton.setAttribute('aria-pressed', String(!this.audio.isMuted))
    this.loadingEl.textContent = this.ready ? '' : this.i18n.t('loading')
  }

  private renderDynamic(): void {
    const snap = this.host.snapshot
    this.balanceEl.textContent = this.money(snap.balanceCents)
    this.winEl.textContent = this.money(this.winCents)
    this.betEl.textContent = this.money(snap.betCents)
    this.linesEl.textContent = this.i18n.t('lines', { n: this.launch.lines.length })
    const busy = snap.busy
    this.spinButton.disabled = !this.ready
    this.spinButton.textContent = busy ? this.i18n.t('stop') : this.i18n.t('spin')
    this.spinButton.classList.toggle('hurry', busy)
    const lockBet = !this.ready || busy || snap.freeSpinsRemaining > 0
    this.betDown.disabled = lockBet || snap.betIndex <= 0
    this.betUp.disabled = lockBet || snap.betIndex >= snap.betLevelsCents.length - 1
    this.autoSelect.disabled = !this.ready
    const round = this.roundId || '—'
    const armed = this.armed ? ` · ${this.i18n.t('previewArmed')}` : ''
    this.fineEl.textContent = `${this.i18n.t('demo')} · ${this.i18n.t('round')} ${round}${armed}`
  }

  private banner(text: string): void {
    this.bannerEl.hidden = false
    this.bannerEl.textContent = text
  }

  private toast(text: string): void {
    this.toastEl.hidden = false
    this.toastEl.textContent = text
    window.setTimeout(() => {
      if (this.toastEl.textContent === text) this.toastEl.hidden = true
    }, 2800)
  }

  private money(cents: number): string {
    return formatCredits(cents, this.i18n.locale)
  }

  private must<T extends Element>(selector: string): T {
    const node = this.root.querySelector(selector)
    if (!node) throw new Error(`missing ${selector}`)
    return node as T
  }
}

function payOf(
  id: SymbolId,
  linePays: ReturnType<DemoHost['launch']>['linePays'],
  scatterPay: OfAKind,
): OfAKind {
  if (id === 'scatter') return scatterPay
  return linePays[id]
}

const TEMPLATE = `
  <header class="top">
    <div class="brand">
      <img class="mark" alt="" data-blob />
      <img class="mark" alt="" data-cloud />
      <div>
        <h1 data-i18n="title"></h1>
        <p data-i18n="subtitle"></p>
      </div>
    </div>
    <div class="top-actions">
      <p class="demo-pill" data-i18n="demo"></p>
      <label class="lang">
        <span class="sr" data-i18n="lang"></span>
        <select data-lang aria-label="Language">
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
      </label>
    </div>
  </header>
  <img class="parade" alt="" data-hero />
  <div class="stage-wrap">
    <p class="banner" data-banner hidden></p>
    <div class="stage" data-stage>
      <p class="loading" data-loading></p>
    </div>
  </div>
  <section class="dock">
    <div class="meter balance">
      <span data-i18n="balance"></span>
      <strong data-balance>0.00</strong>
    </div>
    <div class="meter win">
      <span data-i18n="win"></span>
      <strong data-win>0.00</strong>
    </div>
    <div class="meter bet">
      <span data-i18n="bet"></span>
      <div class="stepper">
        <button type="button" data-bet="down" aria-label="Decrease bet">−</button>
        <strong data-bet-value>0.00</strong>
        <button type="button" data-bet="up" aria-label="Increase bet">+</button>
      </div>
      <small data-lines></small>
    </div>
    <div class="spin-wrap">
      <button type="button" class="spin" data-spin disabled></button>
    </div>
    <div class="tools">
      <label>
        <span data-i18n="auto"></span>
        <select data-auto disabled></select>
      </label>
      <button type="button" data-turbo></button>
      <button type="button" data-sound></button>
      <button type="button" data-pay data-i18n="paytable"></button>
      <button type="button" data-preview data-i18n="preview"></button>
    </div>
  </section>
  <p class="fine" data-fine></p>
  <p class="toast" data-toast role="status" hidden></p>
  <div class="modal" data-modal hidden>
    <div class="sheet" data-sheet role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <header>
        <h2 id="pay-title" data-i18n="paytable"></h2>
        <button type="button" data-close data-i18n="close"></button>
      </header>
      <img class="parade sheet-hero" alt="" data-sheet-hero />
      <p data-i18n="payIntro"></p>
      <p data-pay-extra></p>
      <div class="pay-list" data-pay-list></div>
      <p data-i18n="payScatter"></p>
      <p class="disclaimer" data-i18n="payDemo"></p>
    </div>
  </div>
`
