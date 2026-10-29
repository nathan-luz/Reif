import { z } from 'zod'
import { STYLE_ROLES } from './design-systems'
import { SubgraphPayloadSchema, type SubgraphPayload } from './subgraph'

// ── Estilos (espelham os enums do tldraw v5) ──────────────────────────────
export const COLORS = [
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow',
  'orange', 'green', 'light-green', 'light-red', 'red', 'white',
] as const
export const GEO_TYPES = [
  'rectangle', 'ellipse', 'oval', 'diamond', 'triangle', 'trapezoid', 'rhombus', 'rhombus-2',
  'pentagon', 'hexagon', 'octagon', 'star', 'cloud', 'heart', 'x-box', 'check-box',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
] as const
export const FILLS = ['none', 'semi', 'solid', 'pattern'] as const
export const DASHES = ['draw', 'solid', 'dashed', 'dotted'] as const
export const SIZES = ['s', 'm', 'l', 'xl'] as const
export const NODE_KINDS = ['note', 'text', 'geo', 'line', 'draw', 'frame', 'youtube', 'image'] as const

export const ColorSchema = z.enum(COLORS)
export type NodeKind = (typeof NODE_KINDS)[number]

export const PROVIDERS = ['gemini', 'claude'] as const
export const ProviderSchema = z.enum(PROVIDERS)
export type Provider = z.infer<typeof ProviderSchema>

export const PointSchema = z.object({ x: z.number(), y: z.number() })
export type Point = z.infer<typeof PointSchema>

// ── Plano do LLM ──────────────────────────────────────────────────────────
export const CreateNodeSchema = z.object({
  ref: z.string().describe('Id temporário único deste novo nó, ex: "n1". Usado em connect/frame.'),
  kind: z
    .enum(NODE_KINDS)
    .describe(
      'note = post-it 200x200; text = texto solto; geo = forma geométrica com texto opcional; ' +
        'line = polilinha (points); draw = traço à mão livre (points); frame = contêiner nomeado; youtube = vídeo 480x270; ' +
        'image = espaço para imagem buscada na internet (o usuário escolhe)',
    ),
  text: z.string().describe('Conteúdo/rótulo. Para frame, o nome. Pode ser vazio em geo/line/draw.'),
  x: z.number().describe('Canto superior esquerdo em coordenadas de página. Para line/draw, o primeiro ponto.'),
  y: z.number(),
  w: z.number().optional().describe('geo/frame/image'),
  h: z.number().optional().describe('geo/frame/image'),
  geo: z.enum(GEO_TYPES).optional().describe('Só para geo. Padrão rectangle.'),
  points: z
    .array(PointSchema)
    .describe('OBRIGATÓRIO para line/draw: pontos em coordenadas de página (line: 2-60, draw: 8-60). Vazio [] para os demais.'),
  curved: z.boolean().optional().describe('Só para line: suaviza a polilinha.'),
  role: z
    .enum(STYLE_ROLES)
    .optional()
    .describe('Papel semântico; o design system ativo define cor/fill/dash/size/fonte a partir dele.'),
  color: ColorSchema.optional(),
  fill: z.enum(FILLS).optional(),
  dash: z.enum(DASHES).optional(),
  size: z.enum(SIZES).optional().describe('Espessura do traço / tamanho da fonte'),
  frame: z.string().optional().describe('ref de um frame criado neste plano para conter este nó'),
  query: z.string().optional().describe('youtube/image: termos de busca precisos para encontrar o vídeo ou a imagem.'),
})
export type CreateNode = z.infer<typeof CreateNodeSchema>

export const ConnectSchema = z.object({
  from: z.string().describe('id existente ou ref de nó criado'),
  to: z.string().describe('id existente ou ref de nó criado'),
  label: z.string().optional(),
})
export type Connect = z.infer<typeof ConnectSchema>

export const UpdateSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  color: ColorSchema.optional(),
  x: z.number().optional(),
  y: z.number().optional(),
})
export type Update = z.infer<typeof UpdateSchema>

/** Plano como o LLM o produz (sem mídia resolvida). */
export const LLMPlanSchema = z.object({
  summary: z.string().describe('Uma frase curta descrevendo a mudança, no idioma do usuário'),
  delete: z.array(z.string()).describe('ids de nós/arestas existentes a remover'),
  update: z.array(UpdateSchema),
  create: z.array(CreateNodeSchema),
  connect: z.array(ConnectSchema).describe('Setas novas entre nós'),
})
export type LLMPlan = z.infer<typeof LLMPlanSchema>

export const ResolvedMediaSchema = z.object({ videoId: z.string(), title: z.string() })

/** Nó após o Worker resolver mídias (query → vídeo real). */
export const ResolvedCreateNodeSchema = CreateNodeSchema.extend({ youtube: ResolvedMediaSchema.optional() })
export type ResolvedCreateNode = z.infer<typeof ResolvedCreateNodeSchema>

/** Plano pronto para aplicar no canvas. */
export const MutationPlanSchema = LLMPlanSchema.extend({ create: z.array(ResolvedCreateNodeSchema) })
export type MutationPlan = z.infer<typeof MutationPlanSchema>

export const TransformRequestSchema = z.object({
  provider: ProviderSchema,
  prompt: z.string().trim().min(1).max(4000),
  subgraph: SubgraphPayloadSchema,
  designSystem: z.string().max(40).optional(),
})
export type TransformRequest = z.infer<typeof TransformRequestSchema>

export const TransformResponseSchema = z.object({ plan: MutationPlanSchema, warnings: z.array(z.string()) })
export type TransformResponse = z.infer<typeof TransformResponseSchema>

const MAX_POINTS = 60
const needsPoints = (k: NodeKind) => k === 'line' || k === 'draw'

/**
 * Garante que o LLM só toca na seleção: descarta ids desconhecidos, refs duplicadas,
 * conexões para alvos inexistentes, frames inválidos e linhas sem pontos.
 */
export function sanitizePlan(plan: LLMPlan, subgraph: SubgraphPayload): LLMPlan {
  const known = new Set<string>([...subgraph.nodes.map((n) => n.id), ...subgraph.edges.map((e) => e.id)])
  const seenRefs = new Set<string>()
  const create = plan.create.flatMap((c): CreateNode[] => {
    if (known.has(c.ref) || seenRefs.has(c.ref)) return []
    if (needsPoints(c.kind)) {
      if (c.points.length < 2) return []
      c = { ...c, points: c.points.slice(0, MAX_POINTS) }
    }
    seenRefs.add(c.ref)
    return [c]
  })
  const frameRefs = new Set(create.filter((c) => c.kind === 'frame').map((c) => c.ref))
  const createWithFrames = create.map((c) => {
    if (c.frame === undefined || (frameRefs.has(c.frame) && c.kind !== 'frame')) return c
    const { frame: _drop, ...rest } = c
    return rest
  })
  const del = [...new Set(plan.delete.filter((id) => known.has(id)))]
  const deleted = new Set(del)
  const alive = (id: string) => (known.has(id) && !deleted.has(id)) || seenRefs.has(id)
  return {
    summary: plan.summary,
    delete: del,
    update: plan.update.filter((u) => known.has(u.id) && !deleted.has(u.id)),
    create: createWithFrames,
    connect: plan.connect.filter((c) => c.from !== c.to && alive(c.from) && alive(c.to)),
  }
}

/** Remove campos opcionais que alguns modelos preenchem com "" em vez de omitir. */
export function stripEmptyOptionals(value: unknown, keep: ReadonlySet<string> = new Set(['text', 'summary'])): unknown {
  if (Array.isArray(value)) return value.map((v) => stripEmptyOptionals(v, keep))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k, v]) => v !== '' || keep.has(k))
      .map(([k, v]) => [k, stripEmptyOptionals(v, keep)]),
  )
}
