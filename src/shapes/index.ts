import type { TLAnyShapeUtilConstructor } from 'tldraw'
import { FileShapeUtil } from './file/FileShapeUtil'
import { ImageSlotShapeUtil } from './image-slot/ImageSlotShapeUtil'
import { YouTubeShapeUtil } from './youtube/YouTubeShapeUtil'

/** Referência estável passada ao <Tldraw shapeUtils>. */
export const customShapeUtils: TLAnyShapeUtilConstructor[] = [YouTubeShapeUtil, ImageSlotShapeUtil, FileShapeUtil]
