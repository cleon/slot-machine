import { Howl, Howler } from 'howler'
import { audioUrls } from '../assets/manifest'

export type Cue = keyof typeof audioUrls

/** Synthesized cues. The spin bed loops until the first reel lands. */
export class AudioBus {
  private readonly howls: Record<Cue, Howl>
  private muted = false

  constructor() {
    this.howls = {
      click: new Howl({ src: [audioUrls.click], volume: 0.3 }),
      stop: new Howl({ src: [audioUrls.stop], volume: 0.38 }),
      spin: new Howl({ src: [audioUrls.spin], volume: 0.22, loop: true }),
      win: new Howl({ src: [audioUrls.win], volume: 0.42 }),
      bigwin: new Howl({ src: [audioUrls.bigwin], volume: 0.48 }),
      feature: new Howl({ src: [audioUrls.feature], volume: 0.44 }),
      tease: new Howl({ src: [audioUrls.tease], volume: 0.34 }),
    }
  }

  unlock(): void {
    void Howler.ctx?.resume()
  }

  play(cue: Cue): void {
    if (this.muted || cue === 'spin') return
    this.howls[cue].play()
  }

  startSpin(): void {
    if (this.muted) return
    const bed = this.howls.spin
    if (!bed.playing()) bed.play()
  }

  endSpin(): void {
    this.howls.spin.stop()
  }

  toggle(): boolean {
    this.muted = !this.muted
    Howler.mute(this.muted)
    if (this.muted) this.endSpin()
    return this.muted
  }

  get isMuted(): boolean {
    return this.muted
  }
}
