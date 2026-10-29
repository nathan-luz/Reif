import type { TLShapeId, TLShapePartial, VecLike } from 'tldraw'
import { YOUTUBE_DEFAULT_SIZE, YOUTUBE_SHAPE, type YouTubeShape } from './types'
import type { YouTubeRef } from './youtube-url'

export function youtubeShapePartial(
  id: TLShapeId,
  ref: YouTubeRef & { title?: string },
  topLeft: VecLike,
): TLShapePartial<YouTubeShape> {
  return {
    id,
    type: YOUTUBE_SHAPE,
    x: topLeft.x,
    y: topLeft.y,
    props: { ...YOUTUBE_DEFAULT_SIZE, videoId: ref.videoId, start: ref.start, title: ref.title ?? '' },
  }
}

export async function fetchYouTubeTitle(videoId: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(`/api/youtube/meta/${videoId}`, signal ? { signal } : {})
  if (!res.ok) return null
  const body = (await res.json()) as { title?: string }
  return body.title ?? null
}
