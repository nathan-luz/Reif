import { formatTime } from '../../shared/video'
import type { Analyzer } from './types'

const PEAK_BUCKETS = 160
/** Acima disso não decodificamos o áudio inteiro (memória): onda estilizada. */
const DECODE_LIMIT = 30 * 1024 * 1024

/** Máximo absoluto por balde, normalizado 0..1. Pura (testável). */
export function computePeaks(samples: Float32Array, buckets = PEAK_BUCKETS): number[] {
  const size = Math.max(1, Math.floor(samples.length / buckets))
  const peaks: number[] = []
  let max = 0
  for (let b = 0; b < buckets; b++) {
    let peak = 0
    const end = Math.min(samples.length, (b + 1) * size)
    for (let i = b * size; i < end; i++) {
      const v = Math.abs(samples[i]!)
      if (v > peak) peak = v
    }
    peaks.push(peak)
    if (peak > max) max = peak
  }
  return max > 0 ? peaks.map((p) => Math.round((p / max) * 1000) / 1000) : peaks
}

function durationViaElement(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    audio.onloadedmetadata = () => done(audio.duration)
    audio.onerror = () => done(0)
    audio.src = url
  })
}

export const analyzeAudio: Analyzer = async (file) => {
  let duration = 0
  let peaks: number[] | undefined
  if (file.size <= DECODE_LIMIT) {
    try {
      // Decodificação nativa é assíncrona (fora da thread principal).
      const ctx = new OfflineAudioContext(1, 1, 22050)
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer())
      duration = buffer.duration
      peaks = computePeaks(buffer.getChannelData(0))
    } catch {
      /* formato que o navegador não decodifica: segue só com metadados */
    }
  }
  if (!duration) duration = await durationViaElement(file)
  return { stats: duration ? formatTime(duration) : 'Áudio', excerpt: '', duration, ...(peaks ? { peaks } : {}) }
}
