import { BaseBoxShapeUtil, HTMLContainer, T, stopEventPropagation, type RecordProps } from 'tldraw'
import { ReifIcon } from '../../ui/ReifIcon'
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
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-tl-2 border-2 border-dashed border-tl-low-border bg-tl-low p-3 text-center text-tl-text-3 select-none">
          <ReifIcon name="reif-image" style={{ width: 32, height: 32 }} />
          <span className="line-clamp-2 text-[12px]">{query || 'Imagem'}</span>
          <div className="reif-shape-toolbar" onPointerDown={stopEventPropagation}>
            <button
              type="button"
              className="tlui-button tlui-button__normal"
              onClick={(e) => {
                e.stopPropagation()
                openImagePicker({ query, slotId: shape.id })
              }}
            >
              <ReifIcon name="reif-image-search" small />
              <span className="tlui-button__label">Escolher imagem</span>
            </button>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: ImageSlotShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 6)
    return path
  }
}
