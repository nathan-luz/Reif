import { z } from 'zod'

export const IMAGE_SOURCES = ['unsplash', 'pixabay', 'pexels', 'wikimedia', 'openverse'] as const
export const ImageSourceSchema = z.enum(IMAGE_SOURCES)
export type ImageSource = z.infer<typeof ImageSourceSchema>

export const ImageHitSchema = z.object({
  id: z.string(),
  source: ImageSourceSchema,
  thumb: z.string(),
  /** URL usada no canvas (tamanho "regular"). */
  url: z.string(),
  width: z.number(),
  height: z.number(),
  title: z.string(),
  author: z.string().optional(),
  authorUrl: z.string().optional(),
  pageUrl: z.string(),
  license: z.string().optional(),
  /** Unsplash exige hotlink; as demais são baixadas para o IndexedDB. */
  hotlink: z.boolean(),
  /** Unsplash: endpoint de tracking a chamar quando a imagem é usada. */
  downloadLocation: z.string().optional(),
})
export type ImageHit = z.infer<typeof ImageHitSchema>

export const SourceStatusSchema = z.object({
  source: ImageSourceSchema,
  status: z.enum(['ok', 'empty', 'quota', 'error', 'unconfigured']),
  count: z.number(),
})
export type SourceStatus = z.infer<typeof SourceStatusSchema>

export const ImageSearchResponseSchema = z.object({
  results: z.array(ImageHitSchema),
  sources: z.array(SourceStatusSchema),
})
export type ImageSearchResponse = z.infer<typeof ImageSearchResponseSchema>

/** Intercala as listas (1º de cada fonte, 2º de cada fonte...) e remove duplicatas (URL ou título+tamanho). */
export function interleave(lists: readonly ImageHit[][]): ImageHit[] {
  const out: ImageHit[] = []
  const seen = new Set<string>()
  const max = Math.max(0, ...lists.map((l) => l.length))
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      const hit = list[i]
      if (!hit) continue
      const fingerprint = `${hit.source}|${hit.title.toLowerCase()}|${hit.width}x${hit.height}`
      if (seen.has(hit.url) || seen.has(fingerprint)) continue
      seen.add(hit.url)
      seen.add(fingerprint)
      out.push(hit)
    }
  }
  return out
}
