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

/** Contexto somente-leitura do board ao redor da seleção (para pedidos curtos e ambíguos). */
export const BoardContextSchema = z.object({
  diagram: z
    .object({
      layout: z.string(),
      topic: z.string(),
      path: z.array(z.string()).max(12),
      depth: z.number(),
      siblings: z.array(z.string()).max(40),
      existingChildren: z.array(z.string()).max(40),
      branches: z.array(z.string()).max(40),
    })
    .optional(),
  board: z.array(z.string().max(200)).max(40).optional(),
})
export type BoardContext = z.infer<typeof BoardContextSchema>

export const SubgraphPayloadSchema = z.object({
  /** selection = nós selecionados; viewport = nada selecionado, bounds é a área visível. */
  mode: z.enum(['selection', 'viewport']).default('selection'),
  bounds: RectSchema,
  nodes: z.array(SubgraphNodeSchema),
  edges: z.array(SubgraphEdgeSchema),
  context: BoardContextSchema.optional(),
})
export type SubgraphPayload = z.infer<typeof SubgraphPayloadSchema>
