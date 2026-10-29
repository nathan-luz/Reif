import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { promptBarOpen } from './prompt-bar/state'

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** "/" abre a barra de prompt (sobre a seleção ou, sem seleção, para a área visível). */
export function PromptShortcut() {
  const editor = useEditor()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping(document.activeElement) || editor.getEditingShapeId() !== null) return
      e.preventDefault()
      e.stopPropagation()
      promptBarOpen.set(true)
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [editor])
  return null
}
