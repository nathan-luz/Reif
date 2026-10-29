import { formatTime } from '../../shared/video'
import { canvasToBlob, type Analyzer } from './types'

/** Duração + quadro de capa (~10% do vídeo), sem decodificar o arquivo inteiro. */
export const analyzeVideo: Analyzer = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'metadata'
    video.playsInline = true
    let done = false
    const finish = (thumb?: Blob) => {
      if (done) return
      done = true
      URL.revokeObjectURL(url)
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      resolve({ stats: duration ? formatTime(duration) : 'Vídeo', excerpt: '', duration, ...(thumb ? { thumb } : {}) })
    }
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 10)
    }
    video.onseeked = async () => {
      try {
        const w = 480
        const h = Math.round((video.videoHeight / video.videoWidth) * w) || 270
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')?.drawImage(video, 0, 0, w, h)
        finish(await canvasToBlob(canvas))
      } catch {
        finish()
      }
    }
    video.onerror = () => finish()
    setTimeout(() => finish(), 15_000)
    video.src = url
  })
