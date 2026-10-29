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
  /** Tradução para inglês (igual ao original se já for inglês). */
  english: string
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

export async function getJson<T>(source: ImageSource, url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (res.status === 429 || res.status === 402) {
    const ra = Number(res.headers.get('retry-after'))
    throw new QuotaError(source, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 60 * 60 * 1000)
  }
  if (!res.ok) throw new Error(`${source} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.json()) as T
}

export const USER_AGENT = 'Reif/0.1 (personal study tool; https://github.com/nathan-luz/Reif)'
