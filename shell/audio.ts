import { Howl, Howler } from 'howler'
import { audioUrls } from '../assets/manifest'

export type Cue = keyof typeof audioUrls

/** Short synthesized cues. No licensed soundtrack. */
export class AudioBus {
  private readonly howls: Record<Cue, Howl>
  private muted = false

  constructor() {
    this.howls = {
      click: new Howl({ src: [audioUrls.click], volume: 0.3 }),
      stop: new Howl({ src: [audioUrls.stop], volume: 0.32 }),
      spin: new Howl({ src: [audioUrls.spin], volume: 0.28 }),
      win: new Howl({ src: [audioUrls.win], volume: 0.4 }),
      bigwin: new Howl({ src: [audioUrls.bigwin], volume: 0.42 }),
      feature: new Howl({ src: [audioUrls.feature], volume: 0.4 }),
    }
  }

  unlock(): void {
    void Howler.ctx?.resume()
  }

  play(cue: Cue): void {
    if (this.muted) return
    this.howls[cue].play()
  }

  toggle(): boolean {
    this.muted = !this.muted
    Howler.mute(this.muted)
    return this.muted
  }

  get isMuted(): boolean {
    return this.muted
  }
}
