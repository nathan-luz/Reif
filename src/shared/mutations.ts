import { z } from 'zod'
import { SubgraphPayloadSchema, type SubgraphPayload } from './subgraph'

export const COLORS = [
  'black', 'grey', 'light-violet', 'violet', 'blue', 'light-blue', 'yellow',
  'orange', 'green', 'light-green', 'light-red', 'red', 'white',
] as const
export const ColorSchema = z.enum(COLORS)

export const PROVIDERS = ['gemini', 'claude'] as const
export const ProviderSchema = z.enum(PROVIDERS)
export type Provider = z.infer<typeof ProviderSchema>

export const CreateNodeSchema = z.object({
  ref: z.string().describe('Id temporário único deste novo nó, ex: "n1". Usado em connect.'),
  kind: z
    .enum(['note', 'text', 'geo', 'youtube'])
    .describe('note = post-it 200x200; text = texto solto; geo = retângulo com texto; youtube = vídeo 480x270'),
  text: z.string().describe('Conteúdo do nó. Para youtube, legenda curta (ignorada na renderização).'),
  query: z.string().optional().describe('Só para youtube: termos de busca precisos para encontrar o vídeo.'),
  color: ColorSchema.optional(),
  x: z.number().describe('Canto superior esquerdo, coordenadas de página'),
  y: z.number(),
  w: z.number().optional().describe('Só para geo'),
  h: z.number().optional().describe('Só para geo'),
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
})
export type TransformRequest = z.infer<typeof TransformRequestSchema>

export const TransformResponseSchema = z.object({ plan: MutationPlanSchema, warnings: z.array(z.string()) })
export type TransformResponse = z.infer<typeof TransformResponseSchema>

/**
 * Garante que o LLM só toca na seleção: descarta ids desconhecidos,
 * refs duplicadas e conexões para alvos inexistentes.
 */
export function sanitizePlan(plan: LLMPlan, subgraph: SubgraphPayload): LLMPlan {
  const known = new Set<string>([...subgraph.nodes.map((n) => n.id), ...subgraph.edges.map((e) => e.id)])
  const seenRefs = new Set<string>()
  const create = plan.create.filter((c) => {
    if (known.has(c.ref) || seenRefs.has(c.ref)) return false
    seenRefs.add(c.ref)
    return true
  })
  const del = [...new Set(plan.delete.filter((id) => known.has(id)))]
  const deleted = new Set(del)
  const alive = (id: string) => (known.has(id) && !deleted.has(id)) || seenRefs.has(id)
  return {
    summary: plan.summary,
    delete: del,
    update: plan.update.filter((u) => known.has(u.id) && !deleted.has(u.id)),
    create,
    connect: plan.connect.filter((c) => c.from !== c.to && alive(c.from) && alive(c.to)),
  }
}
