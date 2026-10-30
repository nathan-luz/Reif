import { HTMLContainer, stopEventPropagation, useEditor, useValue } from 'tldraw'
import { generateIntoSlot, generatingSlots, slotPrompt } from '../../canvas/image-gen/generate'
import { openImagePicker } from '../../canvas/image-picker/state'
import { currentDesignSystem } from '../../design-system/state'
import { ReifIcon } from '../../ui/ReifIcon'
import type { ImageSlotShape } from './types'

export function SlotView({ shape }: { shape: ImageSlotShape }) {
  const editor = useEditor()
  const { w, h, query } = shape.props
  const generating = useValue('reif:slot-generating', () => generatingSlots.get().has(shape.id), [shape.id])
  const prompt = slotPrompt(shape)
  return (
    <HTMLContainer style={{ width: w, height: h }}>
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-tl-2 border-2 border-dashed border-tl-low-border bg-tl-low p-3 text-center text-tl-text-3 select-none"
        data-testid="image-slot"
        data-generating={generating || undefined}
      >
        <ReifIcon name={generating ? 'reif-sparkle' : 'reif-image'} style={{ width: 32, height: 32 }} />
        <span className={`line-clamp-2 text-[12px]${generating ? ' reif-pulse' : ''}`}>
          {generating ? 'Desenhando ilustração…' : query || 'Imagem'}
        </span>
        {!generating && (
          <div className="reif-shape-toolbar" onPointerDown={stopEventPropagation}>
            {prompt && (
              <button
                type="button"
                className="tlui-button tlui-button__normal"
                onClick={(e) => {
                  e.stopPropagation()
                  void generateIntoSlot(editor, shape.id, currentDesignSystem())
                }}
              >
                <ReifIcon name="reif-sparkle" small />
                <span className="tlui-button__label">Gerar com IA</span>
              </button>
            )}
            <button
              type="button"
              className="tlui-button tlui-button__normal"
              onClick={(e) => {
                e.stopPropagation()
                openImagePicker({ query, slotId: shape.id })
              }}
            >
              <ReifIcon name="reif-image-search" small />
              <span className="tlui-button__label">Buscar</span>
            </button>
          </div>
        )}
      </div>
    </HTMLContainer>
  )
}
