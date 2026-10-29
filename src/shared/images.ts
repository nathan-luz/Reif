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
