import { mkdir, writeFile } from 'node:fs/promises'

const rate = 32000
const length = Math.round(rate * 4.48)
const audio = new Float32Array(length)
let seed = 85423
function noise() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296 * 2 - 1
}

const strokes = [.08, .24, .41, .59, .84, .99, 1.13, 1.28, 1.59, 1.73, 1.89, 2.13, 2.65, 2.83, 3.03, 3.24, 3.4, 3.52, 3.81, 4.12]
for (const [index, start] of strokes.entries()) {
  const impact = .65 + (index % 4) * .1
  for (let sample = 0; sample < rate * .21; sample++) {
    const time = sample / rate
    const grain = noise()
    const body = Math.sin(time * Math.PI * (288 + index % 4 * 33)) * .38 + Math.sin(time * Math.PI * (768 + index % 3 * 87)) * .19
    const lift = time - .077
    const release = lift > 0 ? grain * .21 * Math.exp(-lift * 188) : 0
    audio[Math.round(start * rate) + sample] += .48 * impact * (body * Math.exp(-time * 66) + grain * .31 * Math.exp(-time * 186) + release)
  }
}
const bytes = Buffer.alloc(44 + length * 2)
bytes.write('RIFF', 0)
bytes.writeUInt32LE(bytes.length - 8, 4)
bytes.write('WAVEfmt ', 8)
bytes.writeUInt32LE(16, 16)
bytes.writeUInt16LE(1, 20)
bytes.writeUInt16LE(1, 22)
bytes.writeUInt32LE(rate, 24)
bytes.writeUInt32LE(rate * 2, 28)
bytes.writeUInt16LE(2, 32)
bytes.writeUInt16LE(16, 34)
bytes.write('data', 36)
bytes.writeUInt32LE(length * 2, 40)
for (let index = 0; index < length; index++) bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, audio[index])) * 32767), 44 + index * 2)
await mkdir('public', { recursive: true })
await writeFile('public/keys.wav', bytes)
