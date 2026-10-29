import {
  IMAGE_SOURCES,
  ImageSearchResponseSchema,
  type ImageHit,
  type ImageSource,
  type SourceStatus,
} from '../../shared/images'

export interface SourceResult {
  status: SourceStatus
  hits: ImageHit[]
}

/** Uma requisição por fonte; `onResult` é chamado conforme cada uma termina. */
export function searchAllSources(
  query: string,
  signal: AbortSignal,
  onResult: (source: ImageSource, result: SourceResult) => void,
): Promise<void> {
  const q = encodeURIComponent(query)
  return Promise.all(
    IMAGE_SOURCES.map(async (source) => {
      try {
        const res = await fetch(`/api/images/search?q=${q}&source=${source}`, { signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = ImageSearchResponseSchema.parse(await res.json())
        const status = data.sources[0] ?? { source, status: 'error' as const, count: 0 }
        if (!signal.aborted) onResult(source, { status, hits: data.results })
      } catch {
        if (!signal.aborted) onResult(source, { status: { source, status: 'error', count: 0 }, hits: [] })
      }
    }),
  ).then(() => undefined)
}

export async function fetchImageFile(url: string, name: string): Promise<File> {
  const res = await fetch(`/api/images/proxy?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`Download falhou (HTTP ${res.status})`)
  const blob = await res.blob()
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

export function trackUnsplash(downloadLocation: string): void {
  void fetch('/api/images/unsplash/track', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ downloadLocation }),
  }).catch(() => {})
}
