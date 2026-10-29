import type { LLMPlan, MutationPlan, ResolvedCreateNode } from '../../src/shared/mutations'
import { searchYouTube } from './youtube'

export interface ResolverEnv {
  YOUTUBE_API_KEY?: string
}

/**
 * Resolve intenções de mídia do LLM em recursos reais (query → videoId).
 * Ponto de extensão para próximos resolvers (ex.: busca de imagens).
 */
export async function resolvePlan(
  plan: LLMPlan,
  env: ResolverEnv,
): Promise<{ plan: MutationPlan; warnings: string[] }> {
  const warnings = new Set<string>()

  const resolved = await Promise.all(
    plan.create.map(async (c): Promise<ResolvedCreateNode | null> => {
      if (c.kind !== 'youtube') return c
      const query = c.query?.trim() || c.text
      if (!env.YOUTUBE_API_KEY) {
        warnings.add('YOUTUBE_API_KEY não configurada: vídeos ignorados')
        return null
      }
      try {
        const hit = await searchYouTube(env.YOUTUBE_API_KEY, query)
        if (hit) return { ...c, youtube: hit }
        warnings.add(`Nenhum vídeo encontrado para "${query}"`)
      } catch (err) {
        console.error(err)
        warnings.add('Falha na busca do YouTube')
      }
      return null
    }),
  )

  const create = resolved.filter((c): c is ResolvedCreateNode => c !== null)
  const dropped = new Set(plan.create.map((c) => c.ref).filter((ref) => !create.some((c) => c.ref === ref)))
  const connect = plan.connect.filter((c) => !dropped.has(c.from) && !dropped.has(c.to))

  return { plan: { ...plan, create, connect }, warnings: [...warnings] }
}
