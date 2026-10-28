import { useEditor, useValue } from 'tldraw'

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

/**
 * Re-renderiza só quando a visibilidade muda (bool), não a cada frame de câmera.
 * A posição é aplicada imperativamente pelo consumidor.
 */
export function useSelectionVisible(): boolean {
  const editor = useEditor()
  return useValue(
    'reif:selection-visible',
    () =>
      editor.getSelectedShapeIds().length > 0 &&
      editor.getEditingShapeId() === null &&
      !editor.isInAny(...BUSY_STATES),
    [editor],
  )
}
