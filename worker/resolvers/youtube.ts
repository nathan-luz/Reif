import { fetchWithRetry, ProviderError } from '../providers/types'

export interface VideoHit {
  videoId: string
  title: string
}

interface SearchResponse {
  items?: { id?: { videoId?: string }; snippet?: { title?: string } }[]
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' }
const decode = (s: string) => s.replace(/&(amp|quot|#39|lt|gt);/g, (m) => ENTITIES[m] ?? m)

/** YouTube Data API v3 — 1 resultado embutível. Custa 100 unidades de quota. */
export async function searchYouTube(apiKey: string, query: string): Promise<VideoHit | null> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    maxResults: '1',
    q: query,
    key: apiKey,
  })
  const res = await fetchWithRetry(`https://www.googleapis.com/youtube/v3/search?${params}`, {}, 2, 15_000)
  if (!res.ok) throw new ProviderError('youtube', res.status, await res.text())
  const item = ((await res.json()) as SearchResponse).items?.[0]
  const videoId = item?.id?.videoId
  return videoId ? { videoId, title: decode(item?.snippet?.title ?? '') } : null
}

/** oEmbed público (sem chave) — só o título. */
export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
  const res = await fetchWithRetry(url, {}, 2, 10_000)
  if (!res.ok) return null
  return ((await res.json()) as { title?: string }).title ?? null
}
