import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEditor } from 'tldraw'

/**
 * Sobreposições (leitor, picker, avisos) acima da UI do tldraw: o slot InFrontOfTheCanvas
 * fica abaixo dos painéis. O portal vai para o container do editor para herdar o tema (--tl-*).
 */
export function Overlay({ children }: { children: ReactNode }) {
  const editor = useEditor()
  return createPortal(<div className="reif-overlay">{children}</div>, editor.getContainer())
}
