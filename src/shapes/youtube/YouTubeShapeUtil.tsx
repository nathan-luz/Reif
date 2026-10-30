import { BaseBoxShapeUtil, HTMLContainer, T, type RecordProps } from 'tldraw'
import { YOUTUBE_DEFAULT_SIZE, YOUTUBE_SHAPE, type YouTubeShape } from './types'
import { YouTubeView } from './YouTubeView'

export class YouTubeShapeUtil extends BaseBoxShapeUtil<YouTubeShape> {
  static override type = YOUTUBE_SHAPE
  static override props: RecordProps<YouTubeShape> = {
    w: T.number,
    h: T.number,
    videoId: T.string,
    title: T.string,
    start: T.number,
  }

  override getDefaultProps(): YouTubeShape['props'] {
    return { ...YOUTUBE_DEFAULT_SIZE, videoId: '', title: '', start: 0 }
  }

  override canEdit() {
    return true
  }

  override isAspectRatioLocked() {
    return true
  }

  override getText(shape: YouTubeShape) {
    return shape.props.title || undefined
  }

  override component(shape: YouTubeShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h, pointerEvents: 'all' }}>
        <YouTubeView shape={shape} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: YouTubeShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 6)
    return path
  }
}
