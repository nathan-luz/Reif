import {
  createShapeId,
  toRichText,
  type Editor,
  type TLArrowBinding,
  type TLArrowShape,
  type TLGeoShape,
  type TLNoteShape,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
  type TLTextShape,
} from 'tldraw'
import type { MutationPlan, ResolvedCreateNode, Update } from '../../shared/mutations'
import { youtubeShapePartial } from '../../shapes/youtube/create'
import { YOUTUBE_DEFAULT_SIZE } from '../../shapes/youtube/types'
import type { SubgraphPayload } from '../../shared/subgraph'
import { placeWithoutOverlap, type Rect } from './placement'

const NOTE_SIZE = 200
const DEFAULT_GEO = { w: 240, h: 120 }
const DEFAULT_TEXT = { w: 240, h: 60 }

const asId = (id: string) => id as TLShapeId

function sizeOf(c: ResolvedCreateNode): { w: number; h: number } {
  if (c.kind === 'youtube') return YOUTUBE_DEFAULT_SIZE
  if (c.kind === 'note') return { w: NOTE_SIZE, h: NOTE_SIZE }
  if (c.kind === 'geo') return { w: c.w ?? DEFAULT_GEO.w, h: c.h ?? DEFAULT_GEO.h }
  return DEFAULT_TEXT
}

function buildCreate(c: ResolvedCreateNode, id: TLShapeId, at: Rect): TLShapePartial | null {
  const richText = toRichText(c.text)
  const color = c.color ? { color: c.color } : {}
  switch (c.kind) {
    case 'note':
      return { id, type: 'note', x: at.x, y: at.y, props: { richText, ...color } } satisfies TLShapePartial<TLNoteShape>
    case 'geo':
      return {
        id, type: 'geo', x: at.x, y: at.y,
        props: { geo: 'rectangle', w: at.w, h: at.h, richText, ...color },
      } satisfies TLShapePartial<TLGeoShape>
    case 'text':
      return { id, type: 'text', x: at.x, y: at.y, props: { richText, autoSize: true, ...color } } satisfies TLShapePartial<TLTextShape>
    case 'youtube':
      return c.youtube ? youtubeShapePartial(id, { ...c.youtube, start: 0 }, at) : null
  }
}

function buildUpdate(shape: TLShape, u: Update): TLShapePartial {
  const props: Record<string, unknown> = {}
  if (u.text !== undefined && 'richText' in shape.props) props['richText'] = toRichText(u.text)
  if (u.color !== undefined && 'color' in shape.props) props['color'] = u.color
  return {
    id: shape.id,
    type: shape.type,
    ...(u.x !== undefined ? { x: u.x } : {}),
    ...(u.y !== undefined ? { y: u.y } : {}),
    props,
  } as TLShapePartial
}

function connect(editor: Editor, from: TLShapeId, to: TLShapeId, label?: string) {
  const id = createShapeId()
  editor.createShape<TLArrowShape>({
    id, type: 'arrow', x: 0, y: 0,
    props: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, ...(label ? { richText: toRichText(label) } : {}) },
  })
  const anchor = { normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false }
  editor.createBindings<TLArrowBinding>([
    { type: 'arrow', fromId: id, toId: from, props: { terminal: 'start', ...anchor } },
    { type: 'arrow', fromId: id, toId: to, props: { terminal: 'end', ...anchor } },
  ])
  return id
}

/** Aplica o plano numa única transação de histórico (1 Ctrl+Z desfaz tudo). */
export function applyPlan(editor: Editor, plan: MutationPlan, subgraph: SubgraphPayload): TLShapeId[] {
  const created: TLShapeId[] = []
  editor.markHistoryStoppingPoint('reif:ai-transform')

  editor.run(() => {
    // DELETE (+ setas do sub-grafo que ficariam soltas)
    const toDelete = new Set(plan.delete)
    for (const e of subgraph.edges) {
      if ((e.from && toDelete.has(e.from)) || (e.to && toDelete.has(e.to))) toDelete.add(e.id)
    }
    editor.deleteShapes([...toDelete].map(asId))

    // UPDATE
    const updates = plan.update.flatMap((u) => {
      const shape = editor.getShape(asId(u.id))
      return shape ? [buildUpdate(shape, u)] : []
    })
    if (updates.length) editor.updateShapes(updates)

    // CREATE com resolução de colisão contra o que restou na página
    const occupied: Rect[] = editor
      .getCurrentPageShapes()
      .filter((s) => s.type !== 'arrow')
      .flatMap((s) => {
        const b = editor.getShapePageBounds(s)
        return b ? [{ x: b.x, y: b.y, w: b.w, h: b.h }] : []
      })

    const refs = new Map<string, TLShapeId>()
    for (const c of plan.create) {
      const id = createShapeId()
      const partial = buildCreate(c, id, placeWithoutOverlap({ x: c.x, y: c.y, ...sizeOf(c) }, occupied))
      if (!partial) continue
      editor.createShape(partial)
      refs.set(c.ref, id)
      created.push(id)
    }

    // CONNECT
    const resolve = (key: string) => refs.get(key) ?? (editor.getShape(asId(key)) ? asId(key) : null)
    for (const c of plan.connect) {
      const from = resolve(c.from)
      const to = resolve(c.to)
      if (from && to) created.push(connect(editor, from, to, c.label))
    }

    if (created.length) editor.select(...created)
  })

  return created
}
