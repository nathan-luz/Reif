import { getFontFamily, type Editor } from 'tldraw'
import type { ResolvedCreateNode } from '../../shared/mutations'

/**
 * Tamanho que cada nó precisa para o texto caber (mesmas fontes/métricas que o tldraw
 * usa ao renderizar). O layout trabalha com esses tamanhos, nunca com os chutes do LLM.
 */

const LABEL_FONT = { s: 1.125, m: 1.375, l: 1.625, xl: 2 } as const
const TEXT_FONT = { s: 1.125, m: 1.5, l: 2.25, xl: 2.75 } as const
const LABEL_PADDING = 16
type Size = keyof typeof LABEL_FONT

/** Largura máxima do texto por papel: rótulos curtos quebram em ~2-3 linhas, nunca em parágrafos largos. */
const GEO_MAX_TEXT_W: Record<string, number> = { title: 300, heading: 280, accent: 260, primary: 220, highlight: 220 }
const TEXT_MAX_W: Record<string, number> = { 'free-text': 4000, title: 900, heading: 420, body: 260, muted: 240 }

/** Formas com área útil de texto menor que a caixa (texto inscrito). */
const SHAPE_FACTOR: Record<string, [number, number]> = {
  ellipse: [1.3, 1.35], oval: [1.15, 1.2], cloud: [1.45, 1.6], diamond: [1.75, 1.8], hexagon: [1.25, 1.1],
  octagon: [1.2, 1.2], pentagon: [1.35, 1.4], triangle: [2, 1.9], star: [2, 2], heart: [1.6, 1.6],
  rhombus: [1.3, 1.1], 'rhombus-2': [1.3, 1.1], trapezoid: [1.3, 1.1],
}

export interface StyleHint {
  size?: string | undefined
  font?: string | undefined
}

interface TextBox {
  w: number
  h: number
}

function measure(editor: Editor | null, text: string, fontSizePx: number, font: string, maxWidth: number | null): TextBox {
  if (editor) {
    try {
      const theme = editor.getCurrentTheme()
      const r = editor.textMeasure.measureText(text, {
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontFamily: getFontFamily(theme, font),
        fontSize: fontSizePx,
        lineHeight: 1.35,
        maxWidth,
        padding: '0px',
      })
      if (r.w > 0 && r.h > 0) return { w: r.w, h: r.h }
    } catch {
      // jsdom/teste: cai na estimativa
    }
  }
  // Estimativa por caracteres (média ~0.55em; fonte "draw" é mais larga).
  const charW = fontSizePx * (font === 'draw' ? 0.6 : font === 'mono' ? 0.62 : 0.53)
  const lines = text.split('\n')
  const natural = Math.max(...lines.map((l) => l.length)) * charW
  const w = maxWidth ? Math.min(natural, maxWidth) : natural
  const wrapped = lines.reduce((n, l) => n + Math.max(1, Math.ceil((l.length * charW) / Math.max(1, w))), 0)
  return { w, h: wrapped * fontSizePx * 1.35 }
}

const sizeOf = (s: string | undefined): Size => (s === 's' || s === 'l' || s === 'xl' ? s : 'm')

/** Tamanho final do nó (w/h) ou null quando o tamanho é fixo/indiferente. */
export function measureNode(editor: Editor | null, c: ResolvedCreateNode, style: StyleHint, role: string): { w: number; h: number } | null {
  const font = style.font ?? 'draw'
  const size = sizeOf(style.size)
  const base = 16
  switch (c.kind) {
    case 'geo': {
      const text = c.text.trim()
      const [fx, fy] = SHAPE_FACTOR[c.geo ?? 'rectangle'] ?? [1, 1]
      if (!text) return null
      const px = base * LABEL_FONT[size]
      const maxW = GEO_MAX_TEXT_W[role] ?? 200
      const natural = measure(editor, text, px, font, null)
      const box = natural.w <= maxW ? natural : measure(editor, text, px, font, maxW)
      const w = Math.ceil((box.w + LABEL_PADDING * 2 + 12) * fx)
      const h = Math.ceil((box.h + LABEL_PADDING * 2) * fy)
      return { w: Math.max(w, 96), h: Math.max(h, 56) }
    }
    case 'text': {
      const text = c.text.trim() || ' '
      const px = base * TEXT_FONT[size]
      const maxW = TEXT_MAX_W[role] ?? 260
      const natural = measure(editor, text, px, font, null)
      const box = natural.w <= maxW ? natural : measure(editor, text, px, font, maxW)
      return { w: Math.ceil(box.w + 16), h: Math.ceil(box.h + 8) }
    }
    case 'note':
      return { w: 200, h: 200 }
    default:
      return null
  }
}
