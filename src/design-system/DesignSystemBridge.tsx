import { useEffect, useLayoutEffect } from 'react'
import { useEditor, useValue } from 'tldraw'
import { getDesignSystem } from '../shared/design-systems'
import { designSystemId } from './state'
import { reskin, trackManualOverrides } from './styling'
import { buildTheme } from './theme'

/**
 * Troca de design system: atualiza as cores ds-* e o fundo no tema (sem tocar nos shapes)
 * e faz o re-skin de fill/dash/size/font dos shapes gerados.
 */
export function DesignSystemBridge() {
  const editor = useEditor()
  const id = useValue(designSystemId)
  const mode = useValue('reif:color-mode', () => editor.getColorMode(), [editor])

  useEffect(() => trackManualOverrides(editor), [editor])

  useEffect(() => {
    const ds = getDesignSystem(id)
    const base = editor.getTheme('default')
    if (base) editor.updateTheme(buildTheme(ds, base))
    reskin(editor, ds)
  }, [editor, id])

  // O fundo do canvas vem de uma variável CSS (o tema só alimenta exportações).
  useLayoutEffect(() => {
    const bg = getDesignSystem(id)[mode].background
    const container = editor.getContainer()
    container.style.setProperty('--tl-color-background', bg)
    return () => {
      container.style.removeProperty('--tl-color-background')
    }
  }, [editor, id, mode])

  return null
}
