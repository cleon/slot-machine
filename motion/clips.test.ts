import { describe, expect, it } from 'vitest'
import { CLIP_IDS, CLIPS } from './clips'
import { ease, sample } from './player'

const REQUIRED = [
  'logo-sting',
  'ambient',
  'win',
  'big-win',
  'feature-in',
  'feature-out',
  'scatter',
  'scatter-hot',
  'veil-spin',
]

describe('motion clips', () => {
  it('ships a sting, ambient loop, win, feature, and scatter overlays', () => {
    for (const id of REQUIRED) expect(CLIP_IDS).toContain(id)
  })

  it('uses sorted keyframes inside 0..1 and a positive duration', () => {
    for (const clip of Object.values(CLIPS)) {
      expect(clip.duration).toBeGreaterThan(200)
      for (const track of clip.tracks) {
        expect(track.keys.length).toBeGreaterThan(0)
        const times = track.keys.map((key) => key.t)
        expect(times).toEqual([...times].sort((a, b) => a - b))
        for (const time of times) {
          expect(time).toBeGreaterThanOrEqual(0)
          expect(time).toBeLessThanOrEqual(1)
        }
      }
    }
    expect(CLIPS.ambient?.loop).toBe(true)
  })

  it('samples a count-up pose between the keys', () => {
    const keys = CLIPS.win?.tracks.find((track) => track.kind === 'counter')?.keys
    expect(keys).toBeTruthy()
    const mid = sample(keys ?? [], 0.5)
    expect(mid.alpha).toBeGreaterThan(0)
    expect(ease('outCubic', 1)).toBe(1)
    expect(ease('outBack', 0.6)).toBeGreaterThan(1)
  })
})