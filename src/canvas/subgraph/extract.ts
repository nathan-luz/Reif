import type { Editor, TLArrowBinding, TLArrowShape, TLShape, TLShapeId } from 'tldraw'
import type { SubgraphEdge, SubgraphNode, SubgraphPayload } from '../../shared/subgraph'

/** Props que não agregam semântica para o LLM e só inflam o payload. */
const OMITTED_PROPS = new Set([
  'richText',
  'text',
  'scale',
  'autoSize',
  'growY',
  'fontSizeAdjustment',
  'textLastEditedBy',
])

const isMeaningful = (v: unknown) => v !== '' && v !== null && v !== undefined

const isArrow = (s: TLShape): s is TLArrowShape => s.type === 'arrow'

const round = (n: number) => Math.round(n * 100) / 100

function getShapeText(editor: Editor, shape: TLShape): string | undefined {
  const text = editor.getShapeUtil(shape).getText(shape)?.trim()
  return text ? text : undefined
}

function toNode(editor: Editor, shape: TLShape): SubgraphNode | null {
  const b = editor.getShapePageBounds(shape)
  if (!b) return null
  const props = Object.fromEntries(
    Object.entries(shape.props as Record<string, unknown>).filter(([k, v]) => !OMITTED_PROPS.has(k) && isMeaningful(v)),
  )
  const text = getShapeText(editor, shape)
  return {
    id: shape.id,
    type: shape.type,
    bounds: { x: round(b.x), y: round(b.y), w: round(b.w), h: round(b.h) },
    rotation: round(shape.rotation),
    ...(text ? { text } : {}),
    props,
  }
}

function toEdge(editor: Editor, arrow: TLArrowShape): SubgraphEdge {
  const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
  const from = bindings.find((b) => b.props.terminal === 'start')?.toId
  const to = bindings.find((b) => b.props.terminal === 'end')?.toId
  const label = getShapeText(editor, arrow)
  return {
    id: arrow.id,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(label ? { label } : {}),
  }
}

/**
 * Serializa a seleção atual como sub-grafo: shapes viram nós, setas viram arestas.
 * Setas não selecionadas que ligam dois nós selecionados também entram.
 */
export function extractSubgraph(editor: Editor): SubgraphPayload | null {
  const bounds = editor.getSelectionPageBounds()
  const selected = editor.getSelectedShapes()
  if (!bounds || selected.length === 0) return null

  const nodeShapes = selected.filter((s) => !isArrow(s))
  const nodeIds = new Set<TLShapeId>(nodeShapes.map((s) => s.id))
  const arrows = new Map<TLShapeId, TLArrowShape>()

  for (const s of selected) if (isArrow(s)) arrows.set(s.id, s)

  for (const s of nodeShapes) {
    for (const binding of editor.getBindingsToShape<TLArrowBinding>(s, 'arrow')) {
      if (arrows.has(binding.fromId)) continue
      const arrow = editor.getShape<TLArrowShape>(binding.fromId)
      if (!arrow) continue
      const ends = editor.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
      if (ends.length === 2 && ends.every((e) => nodeIds.has(e.toId))) arrows.set(arrow.id, arrow)
    }
  }

  return {
    bounds: { x: round(bounds.x), y: round(bounds.y), w: round(bounds.w), h: round(bounds.h) },
    nodes: nodeShapes.flatMap((s) => toNode(editor, s) ?? []),
    edges: [...arrows.values()].map((a) => toEdge(editor, a)),
  }
}
