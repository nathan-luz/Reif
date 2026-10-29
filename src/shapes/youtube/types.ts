import type { TLShape } from 'tldraw'

export const YOUTUBE_SHAPE = 'youtube' as const
export const YOUTUBE_DEFAULT_SIZE = { w: 480, h: 270 } as const

export interface YouTubeShapeProps {
  w: number
  h: number
  videoId: string
  title: string
  start: number
}

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    youtube: YouTubeShapeProps
  }
}

export type YouTubeShape = TLShape<typeof YOUTUBE_SHAPE>
