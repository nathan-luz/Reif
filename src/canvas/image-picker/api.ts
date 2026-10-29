import { ImageSearchResponseSchema, type ImageSearchResponse } from '../../shared/images'

export async function searchImages(query: string, signal?: AbortSignal): Promise<ImageSearchResponse> {
  const res = await fetch(`/api/images/search?q=${encodeURIComponent(query)}`, signal ? { signal } : {})
  if (!res.ok) throw new Error(`Busca falhou (HTTP ${res.status})`)
  return ImageSearchResponseSchema.parse(await res.json())
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
