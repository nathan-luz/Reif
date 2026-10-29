import { BaseBoxShapeUtil, HTMLContainer, T, stopEventPropagation, type RecordProps } from 'tldraw'
import { openImagePicker } from '../../canvas/image-picker/state'
import { IMAGE_SLOT_DEFAULT_SIZE, IMAGE_SLOT_SHAPE, type ImageSlotShape } from './types'

/** Espaço reservado criado pelo LLM; o usuário escolhe a imagem no picker. */
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
    const { w, h, query } = shape.props
    return (
      <HTMLContainer style={{ width: w, height: h }}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/25 bg-black/[0.03] p-3 text-center select-none">
          <span className="text-2xl" aria-hidden>
            🖼
          </span>
          <span className="line-clamp-2 text-xs text-black/60">{query || 'Imagem'}</span>
          <button
            type="button"
            className="rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white"
            style={{ pointerEvents: 'all' }}
            onPointerDown={stopEventPropagation}
            onClick={(e) => {
              e.stopPropagation()
              openImagePicker({ query, slotId: shape.id })
            }}
          >
            Escolher imagem
          </button>
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ImageSlotShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 8)
    return path
  }
}
