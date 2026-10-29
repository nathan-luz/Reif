import type { ImageHit, ImageSearchResponse, ImageSource, SourceStatus } from '../../src/shared/images'
import { IMAGE_PROVIDERS } from './providers'
import { toEnglishQuery } from './translate'
import { QuotaError, type ImageEnv, type ImageQuery } from './types'

const PER_SOURCE = 12
const TIMEOUT_MS = 8_000

/**
 * Circuit breaker por isolate: fonte com cota estourada é pulada até expirar.
 * Suficiente para uso pessoal; trocar por KV se precisar persistir entre isolates.
 */
const exhausted = new Map<ImageSource, number>()

/** Intercala as listas (1º de cada fonte, 2º de cada fonte...) e remove duplicatas (URL ou título+tamanho). */
export function interleave(lists: ImageHit[][]): ImageHit[] {
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

export async function searchImages(raw: string, env: ImageEnv): Promise<ImageSearchResponse> {
  const english = await toEnglishQuery(raw, env.GEMINI_API_KEY)
  const differs = english.toLowerCase() !== raw.toLowerCase()
  const query: ImageQuery = { original: raw, english, ...(differs ? { lang: 'pt' } : {}) }
  const now = Date.now()
  const settled = await Promise.all(
    IMAGE_PROVIDERS.map(async (p): Promise<{ hits: ImageHit[]; status: SourceStatus }> => {
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
