import { createShapeId, type Editor, type JsonObject, type TLRichText, type TLShapeId, type TLShapePartial } from 'tldraw'
import { withSystemWrite } from '../../design-system/styling'
import type { DesignSystem, StyleRole } from '../../shared/design-systems'
import { styleFor } from '../mutations/build'
import { connect, occupiedRects } from '../mutations/apply'
import { groupOffset } from '../mutations/placement'

export interface Card {
  role: StyleRole
  richText: TLRichText
}

export interface CardLayout {
  /** Shape de origem (vídeo): o frame nasce à direita dele e recebe uma seta. */
  sourceId: TLShapeId
  frameName: string
  title: string
  /** Cards de largura total, no topo. */
  header: Card[]
  /** Cards em colunas (masonry). */
  cards: Card[]
  columns: number
  columnWidth: number
  /** Metadados extras guardados no frame (ex.: transcrição bruta). */
  frameMeta?: JsonObject
}

const PAD = 32
const GAP = 24

function card(editor: Editor, ds: DesignSystem, c: Card, x: number, y: number, w: number): { id: TLShapeId; h: number } {
  const id = createShapeId()
  const { props, meta } = styleFor(ds, 'geo', c.role)
  editor.createShape({
    // parentId explícito: sem ele o tldraw "captura" o shape no frame que estiver embaixo.
    id, type: 'geo', x, y, meta, parentId: editor.getCurrentPageId(),
    props: { geo: 'rectangle', w, h: 60, richText: c.richText, align: 'start', verticalAlign: 'start', ...props },
  } as TLShapePartial)
  // A altura real (growY) só é conhecida depois que o texto é medido.
  return { id, h: editor.getShapePageBounds(id)?.h ?? 60 }
}

/**
 * Cria um frame ao lado da origem com título + cards (masonry medido de verdade),
 * evita colisões deslocando o bloco inteiro e liga origem → frame com uma seta.
 * Uma única entrada no histórico.
 */
export function renderCards(editor: Editor, ds: DesignSystem, layout: CardLayout): TLShapeId | null {
  const source = editor.getShapePageBounds(layout.sourceId)
  if (!source) return null
  const totalW = layout.columns * layout.columnWidth + (layout.columns - 1) * GAP
  const x0 = source.maxX + 120
  const y0 = source.y
  const frameId = createShapeId()

  editor.markHistoryStoppingPoint('reif:video-render')
  withSystemWrite(() =>
    editor.run(() => {
      const occupied = occupiedRects(editor)
      const children: TLShapeId[] = []

      // Título
      const titleId = createShapeId()
      const title = styleFor(ds, 'text', 'title')
      editor.createShape({
        id: titleId, type: 'text', x: x0 + PAD, y: y0 + PAD, meta: title.meta, parentId: editor.getCurrentPageId(),
        props: {
          richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: layout.title }] }] },
          autoSize: false, w: totalW, ...title.props,
        },
      } as TLShapePartial)
      children.push(titleId)
      let y = y0 + PAD + (editor.getShapePageBounds(titleId)?.h ?? 40) + GAP

      for (const c of layout.header) {
        const r = card(editor, ds, c, x0 + PAD, y, totalW)
        children.push(r.id)
        y += r.h + GAP
      }

      const colY = Array.from({ length: layout.columns }, () => y)
      for (const c of layout.cards) {
        const col = colY.indexOf(Math.min(...colY))
        const r = card(editor, ds, c, x0 + PAD + col * (layout.columnWidth + GAP), colY[col]!, layout.columnWidth)
        children.push(r.id)
        colY[col] = colY[col]! + r.h + GAP
      }

      const h = Math.max(...colY, y) - GAP + PAD - y0
      const w = totalW + PAD * 2
      const frame = styleFor(ds, 'frame', 'container')
      editor.createShape({
        id: frameId, type: 'frame', x: x0, y: y0, parentId: editor.getCurrentPageId(),
        meta: { ...frame.meta, ...(layout.frameMeta ?? {}) },
        props: { w, h, name: layout.frameName, ...frame.props },
      } as TLShapePartial)
      editor.reparentShapes(children, frameId)

      const dx = groupOffset([{ x: x0, y: y0, w, h }], occupied)
      if (dx) editor.updateShape({ id: frameId, type: 'frame', x: x0 + dx })

      connect(editor, ds, layout.sourceId, frameId)
      editor.select(frameId)
    }),
  )
  return frameId
}
