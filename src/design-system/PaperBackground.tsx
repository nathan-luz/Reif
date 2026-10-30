import { useEditor, useValue } from 'tldraw'
import { getDesignSystem, type Paper } from '../shared/design-systems'
import { mix } from './color'
import { designSystemId } from './state'

/** Passo do papel em unidades de página (pontilhado/quadriculado/pautado acompanham a câmera). */
const STEP = 28

function pattern(paper: Paper, ink: string, bg: string, step: number) {
  const line = mix(ink, bg, paper === 'dots' ? 0.72 : 0.86)
  switch (paper) {
    case 'dots':
      return `radial-gradient(circle, ${line} ${Math.max(0.6, step * 0.045)}px, transparent ${Math.max(0.9, step * 0.055)}px)`
    case 'grid':
      return `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`
    case 'lines':
      return `linear-gradient(transparent ${step - 1}px, ${line} ${step - 1}px)`
  }
}

/** Fundo do whiteboard com o papel do design system (substitui o .tl-background padrão). */
export function PaperBackground() {
  const editor = useEditor()
  const id = useValue(designSystemId)
  const mode = useValue('reif:paper-mode', () => editor.getColorMode(), [editor])
  const cam = useValue('reif:paper-cam', () => editor.getCamera(), [editor])
  const ds = getDesignSystem(id)
  const paper = ds.paper?.[mode]
  if (!paper) return <div className="tl-background" />
  const step = STEP * cam.z
  // Sem papel quando o zoom deixa o padrão ilegível (evita moiré).
  if (step < 6) return <div className="tl-background" />
  const palette = ds[mode]
  return (
    <div
      className="tl-background"
      data-paper={paper}
      style={{
        backgroundImage: pattern(paper, palette.colors['ds-ink'], palette.background, step),
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: `${(cam.x * cam.z) % step}px ${(cam.y * cam.z) % step}px`,
      }}
    />
  )
}
