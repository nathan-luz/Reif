import { stopEventPropagation } from 'tldraw'
import { openImagePicker } from './image-picker/state'

export function TopPanel() {
  return (
    <div className="pointer-events-auto mt-2 flex gap-2">
      <button
        type="button"
        onPointerDown={stopEventPropagation}
        onClick={() => openImagePicker({ query: '' })}
        className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-black/5"
      >
        🖼 Imagens
      </button>
    </div>
  )
}
