import { USER_AGENT } from './types'

const MAX_BYTES = 15 * 1024 * 1024

/** Baixa a imagem no edge (evita CORS) para o browser guardá-la no IndexedDB. */
export async function proxyImage(raw: string): Promise<Response> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return new Response('url inválida', { status: 400 })
  }
  if (url.protocol !== 'https:') return new Response('só https', { status: 400 })

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) })
  const type = res.headers.get('content-type') ?? ''
  if (!res.ok) return new Response(`origem ${res.status}`, { status: 502 })
  if (!type.startsWith('image/')) return new Response('não é imagem', { status: 415 })
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return new Response('muito grande', { status: 413 })

  return new Response(res.body, {
    headers: { 'content-type': type, 'cache-control': 'public, max-age=86400' },
  })
}

/** Unsplash exige disparar o download_location quando a foto é usada. */
export async function trackUnsplashDownload(downloadLocation: string, accessKey: string): Promise<void> {
  const url = new URL(downloadLocation)
  if (url.hostname !== 'api.unsplash.com') return
  await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` }, signal: AbortSignal.timeout(5_000) })
}
