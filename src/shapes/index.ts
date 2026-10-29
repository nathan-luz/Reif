import type { TLAnyShapeUtilConstructor } from 'tldraw'
import { YouTubeShapeUtil } from './youtube/YouTubeShapeUtil'

/** Referência estável passada ao <Tldraw shapeUtils>. */
export const customShapeUtils: TLAnyShapeUtilConstructor[] = [YouTubeShapeUtil]
