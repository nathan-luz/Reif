const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export interface YouTubeRef {
  videoId: string
  /** Segundo inicial. */
  start: number
}

export const isVideoId = (id: string) => VIDEO_ID.test(id)

/** Aceita watch, youtu.be, embed, shorts, live, nocookie e m./music. */
export function parseYouTubeUrl(input: string): YouTubeRef | null {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : (url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ?? null)
  }
  if (!id || !isVideoId(id)) return null
  return { videoId: id, start: parseStart(url.searchParams.get('t') ?? url.searchParams.get('start')) }
}

/** "90", "90s", "1m30s", "1h2m3s" → segundos. */
export function parseStart(t: string | null): number {
  if (!t) return 0
  if (/^\d+$/.test(t)) return Number(t)
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!m) return 0
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

export const thumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

export const embedUrl = (videoId: string, start: number) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1${start ? `&start=${start}` : ''}`
