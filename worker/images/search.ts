import { interleave, type ImageHit, type ImageSearchResponse, type ImageSource, type SourceStatus } from '../../src/shared/images'
import { IMAGE_PROVIDERS } from './providers'
import { looksPortuguese, toEnglishQuery } from './translate'
import { QuotaError, type ImageEnv, type ImageQuery } from './types'

const PER_SOURCE = 12
const TIMEOUT_MS = 10_000

/**
 * Circuit breaker por isolate: fonte com cota estourada é pulada até expirar.
 * Suficiente para uso pessoal; trocar por KV se precisar persistir entre isolates.
 */
const exhausted = new Map<ImageSource, number>()

/** `only` restringe a uma fonte (o picker consulta cada fonte em paralelo e mostra progressivamente). */
export async function searchImages(raw: string, env: ImageEnv, only?: ImageSource): Promise<ImageSearchResponse> {
  let english: Promise<string> | undefined
  const query: ImageQuery = {
    original: raw,
    english: () => (english ??= toEnglishQuery(raw, env.GEMINI_API_KEY)),
    ...(looksPortuguese(raw) ? { lang: 'pt' } : {}),
  }
  const now = Date.now()
  const settled = await Promise.all(
    IMAGE_PROVIDERS.filter((p) => !only || p.source === only).map(async (p): Promise<{ hits: ImageHit[]; status: SourceStatus }> => {
      const status = (s: SourceStatus['status'], count = 0): SourceStatus => ({ source: p.source, status: s, count })
      if (!p.isConfigured(env)) return { hits: [], status: status('unconfigured') }
      if ((exhausted.get(p.source) ?? 0) > now) return { hits: [], status: status('quota') }
      try {
        const hits = await p.search(query, env, PER_SOURCE, AbortSignal.timeout(TIMEOUT_MS))
        return { hits, status: status(hits.length ? 'ok' : 'empty', hits.length) }
      } catch (err) {
        if (err instanceof QuotaError) {
          exhausted.set(p.source, now + err.retryAfterMs)
          return { hits: [], status: status('quota') }
        }
        console.error(err)
        return { hits: [], status: status('error') }
      }
    }),
  )
  return { results: interleave(settled.map((s) => s.hits)), sources: settled.map((s) => s.status) }
}
