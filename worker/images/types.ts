import type { ImageHit, ImageSource } from '../../src/shared/images'

export interface ImageEnv {
  UNSPLASH_ACCESS_KEY?: string
  PIXABAY_API_KEY?: string
  PEXELS_API_KEY?: string
  GEMINI_API_KEY?: string
}

export interface ImageQuery {
  /** Como o usuário digitou. */
  original: string
  /** Tradução para inglês, resolvida sob demanda (só quem precisa espera). */
  english: () => Promise<string>
  /** ISO 639-1 do original quando difere do inglês (ex.: 'pt'). */
  lang?: string
}

export interface ImageProvider {
  readonly source: ImageSource
  isConfigured(env: ImageEnv): boolean
  search(query: ImageQuery, env: ImageEnv, perPage: number, signal: AbortSignal): Promise<ImageHit[]>
}

/** Cota esgotada / rate limit: o agregador pula a fonte até `retryAfterMs`. */
export class QuotaError extends Error {
  constructor(
    readonly source: ImageSource,
    readonly retryAfterMs: number,
  ) {
    super(`${source}: quota`)
  }
}

export const USER_AGENT = 'Reif/0.1 (personal study tool; https://github.com/nathan-luz/Reif)'

const DEFAULT_RETRY_MS = 60_000

/** Segundos até liberar, a partir dos headers padrão de rate limit. */
function retryAfterMs(h: Headers): number {
  for (const name of ['retry-after', 'x-ratelimit-reset']) {
    const v = Number(h.get(name))
    if (Number.isFinite(v) && v > 0) return Math.min(v, 24 * 3600) * 1000
  }
  return DEFAULT_RETRY_MS
}

const isQuota = (res: Response) =>
  res.status === 429 || res.status === 402 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')

export async function getJson<T>(source: ImageSource, url: string, init: RequestInit): Promise<T> {
  // Sem User-Agent, a proteção anti-bot (Cloudflare) de algumas APIs responde 429.
  const headers = new Headers(init.headers)
  if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT)
  headers.set('Accept', 'application/json')
  const res = await fetch(url, { ...init, headers })
  if (isQuota(res)) {
    console.warn(`${source} rate limited (${res.status})`)
    throw new QuotaError(source, retryAfterMs(res.headers))
  }
  if (!res.ok) throw new Error(`${source} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

