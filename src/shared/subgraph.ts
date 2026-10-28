import { z } from 'zod'

/** Contrato compartilhado entre o canvas (browser) e o Worker (LLM). */

export const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})
export type Rect = z.infer<typeof RectSchema>

export const SubgraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  bounds: RectSchema,
  rotation: z.number(),
  text: z.string().optional(),
  /** Props específicas do shape (cor, geo, url do vídeo...). Opaco para o LLM. */
  props: z.record(z.string(), z.unknown()),
})
export type SubgraphNode = z.infer<typeof SubgraphNodeSchema>

export const SubgraphEdgeSchema = z.object({
  id: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  label: z.string().optional(),
})
export type SubgraphEdge = z.infer<typeof SubgraphEdgeSchema>

export const SubgraphPayloadSchema = z.object({
  bounds: RectSchema,
  nodes: z.array(SubgraphNodeSchema),
  edges: z.array(SubgraphEdgeSchema),
})
export type SubgraphPayload = z.infer<typeof SubgraphPayloadSchema>
