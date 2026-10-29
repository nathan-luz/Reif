export interface Analysis {
  stats: string
  excerpt: string
  title?: string
  thumb?: Blob
  /** Áudio: picos normalizados 0..1. */
  peaks?: number[]
  duration?: number
  /** Texto completo para a IA (limitado). */
  text?: string
  /** Modelo pronto para o leitor (fases 11+), guardado como derivado. */
  model?: unknown
}

export type Analyzer = (file: Blob, name: string) => Promise<Analysis>

export const MAX_TEXT = 400_000
export const EXCERPT = 420

export const excerptOf = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, EXCERPT)

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`

export function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, type = 'image/webp', quality = 0.82): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type, quality })
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))), type, quality),
  )
}
