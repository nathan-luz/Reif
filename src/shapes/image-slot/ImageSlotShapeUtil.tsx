import { BaseBoxShapeUtil, T, type RecordProps } from 'tldraw'
import { SlotView } from './SlotView'
import { IMAGE_SLOT_DEFAULT_SIZE, IMAGE_SLOT_SHAPE, type ImageSlotShape } from './types'

/** Espaço reservado criado pelo LLM: ilustração gerada por IA ou imagem escolhida no picker. */
export class ImageSlotShapeUtil extends BaseBoxShapeUtil<ImageSlotShape> {
  static override type = IMAGE_SLOT_SHAPE
  static override props: RecordProps<ImageSlotShape> = { w: T.number, h: T.number, query: T.string }

  override getDefaultProps(): ImageSlotShape['props'] {
    return { ...IMAGE_SLOT_DEFAULT_SIZE, query: '' }
  }

  override getText(shape: ImageSlotShape) {
    return shape.props.query ? `[imagem: ${shape.props.query}]` : undefined
  }

  override component(shape: ImageSlotShape) {
    return <SlotView shape={shape} />
  }

  override getIndicatorPath(shape: ImageSlotShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 6)
    return path
  }
}
