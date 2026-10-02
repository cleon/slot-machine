import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio')
mkdirSync(outDir, { recursive: true })

function wav(samples) {
  const dataSize = samples.length * 2
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(sample * 32767), 44 + i * 2)
  }
  return buf
}

function tone(freq, seconds, volume, decay) {
  const n = Math.floor(SR * seconds)
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const attack = Math.min(1, i / (SR * 0.008))
    out[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-decay * t) * attack * volume
  }
  return out
}

function sequence(notes) {
  const end = Math.max(...notes.map((note) => note.at + note.dur))
  const out = new Array(Math.floor(SR * end)).fill(0)
  for (const note of notes) {
    const chunk = tone(note.freq, note.dur, note.vol, note.decay ?? 7)
    const start = Math.floor(note.at * SR)
    for (let i = 0; i < chunk.length; i++) out[start + i] += chunk[i]
  }
  return out
}

function whoosh() {
  const n = Math.floor(SR * 0.26)
  const out = new Array(n)
  let prev = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const white = Math.random() * 2 - 1
    prev = prev * 0.62 + white * 0.38
    const env = Math.sin(Math.PI * t)
    const sweep = Math.sin(2 * Math.PI * (180 + 520 * t) * (i / SR))
    out[i] = (prev * 0.45 + sweep * 0.12) * env * 0.55
  }
  return out
}

const files = {
  'click.wav': tone(740, 0.045, 0.35, 28),
  'stop.wav': sequence([
    { freq: 210, at: 0, dur: 0.09, vol: 0.45, decay: 22 },
    { freq: 640, at: 0, dur: 0.04, vol: 0.16, decay: 40 },
  ]),
  'spin.wav': whoosh(),
  'win.wav': sequence([
    { freq: 523.25, at: 0, dur: 0.16, vol: 0.32, decay: 6 },
    { freq: 659.25, at: 0.09, dur: 0.16, vol: 0.32, decay: 6 },
    { freq: 783.99, at: 0.18, dur: 0.22, vol: 0.34, decay: 5 },
  ]),
  'bigwin.wav': sequence([
    { freq: 523.25, at: 0, dur: 0.18, vol: 0.3, decay: 5 },
    { freq: 659.25, at: 0.1, dur: 0.18, vol: 0.3, decay: 5 },
    { freq: 783.99, at: 0.2, dur: 0.18, vol: 0.32, decay: 5 },
    { freq: 1046.5, at: 0.3, dur: 0.28, vol: 0.34, decay: 4 },
  ]),
  'feature.wav': sequence([
    { freq: 659.25, at: 0, dur: 0.16, vol: 0.3, decay: 5 },
    { freq: 783.99, at: 0.1, dur: 0.16, vol: 0.3, decay: 5 },
    { freq: 987.77, at: 0.2, dur: 0.16, vol: 0.3, decay: 5 },
    { freq: 1318.5, at: 0.3, dur: 0.24, vol: 0.28, decay: 4 },
  ]),
}

for (const [name, samples] of Object.entries(files)) {
  writeFileSync(join(outDir, name), wav(samples))
}
