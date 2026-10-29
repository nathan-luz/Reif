import { useEditor, useValue } from 'tldraw'
import { promptBarOpen } from '../prompt-bar/state'

/** Estados em que a barra atrapalharia a interação direta com o canvas. */
const BUSY_STATES = [
  'select.translating',
  'select.resizing',
  'select.rotating',
  'select.brushing',
  'select.scribble_brushing',
  'select.dragging_handle',
  'select.crop',
] as const

export type PromptBarMode = 'hidden' | 'selection' | 'viewport'

/**
 * Re-renderiza só quando o modo muda, não a cada frame de câmera.
 * A posição é aplicada imperativamente pelo consumidor.
 */
export function usePromptBarMode(): PromptBarMode {
  const editor = useEditor()
  return useValue(
    'reif:prompt-bar-mode',
    () => {
      if (editor.getEditingShapeId() !== null || editor.isInAny(...BUSY_STATES)) return 'hidden'
      if (editor.getSelectedShapeIds().length > 0) return 'selection'
      return promptBarOpen.get() ? 'viewport' : 'hidden'
    },
    [editor],
  )
}
