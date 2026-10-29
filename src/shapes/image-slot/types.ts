import type { TLShape } from 'tldraw'

export const IMAGE_SLOT_SHAPE = 'image-slot' as const
export const IMAGE_SLOT_DEFAULT_SIZE = { w: 320, h: 240 } as const

export interface ImageSlotShapeProps {
  w: number
  h: number
  query: string
}

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    'image-slot': ImageSlotShapeProps
  }
}

export type ImageSlotShape = TLShape<typeof IMAGE_SLOT_SHAPE>
