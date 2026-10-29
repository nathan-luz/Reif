import {
  createShapeId,
  toRichText,
  type Editor,
  type TLArrowBinding,
  type TLArrowShape,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw'
import type { MutationPlan, Update } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import { buildCreate, footprint, type Placement } from './build'
import { groupOffset, type Rect } from './placement'

const asId = (id: string) => id as TLShapeId

function buildUpdate(shape: TLShape, u: Update): TLShapePartial {
  const props: Record<string, unknown> = {}
  if (u.text !== undefined && 'richText' in shape.props) props['richText'] = toRichText(u.text)
  if (u.text !== undefined && shape.type === 'frame') props['name'] = u.text
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

function occupiedRects(editor: Editor): Rect[] {
  return editor
    .getCurrentPageShapes()
    .filter((s) => s.type !== 'arrow' && !s.parentId.startsWith('shape:'))
    .flatMap((s) => {
      const b = editor.getShapePageBounds(s)
      return b ? [{ x: b.x, y: b.y, w: b.w, h: b.h }] : []
    })
}

export interface ApplyResult {
  created: TLShapeId[]
  /** Slots de imagem criados, na ordem do plano (o picker abre no primeiro). */
  imageSlots: TLShapeId[]
}

/** Aplica o plano numa única transação de histórico (1 Ctrl+Z desfaz tudo). */
export function applyPlan(editor: Editor, plan: MutationPlan, subgraph: SubgraphPayload): ApplyResult {
  const created: TLShapeId[] = []
  const imageSlots: TLShapeId[] = []
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

    // CREATE: composição deslocada como bloco; frames antes dos filhos
    const dx = groupOffset(plan.create.map(footprint), occupiedRects(editor))
    const ordered = [...plan.create].sort((a, b) => Number(b.kind === 'frame') - Number(a.kind === 'frame'))
    const refs = new Map<string, TLShapeId>()
    const frames = new Map<string, Placement['parent']>()

    for (const c of ordered) {
      const id = createShapeId()
      const parent = c.frame ? frames.get(c.frame) : undefined
      const partial = buildCreate(c, { id, dx, ...(parent ? { parent } : {}) })
      if (!partial) continue
      editor.createShape(partial)
      refs.set(c.ref, id)
      if (c.kind === 'frame') frames.set(c.ref, { id, x: c.x + dx, y: c.y })
      if (c.kind === 'image') imageSlots.push(id)
      if (!parent) created.push(id)
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

  return { created, imageSlots }
}
