import {
  compressLegacySegments,
  createShapeId,
  toRichText,
  type Editor,
  type TLArrowBinding,
  type TLArrowShape,
  type TLDrawShape,
  type TLGeoShape,
  type TLParentId,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw'
import type { DesignSystem } from '../../shared/design-systems'
import type { MutationPlan, Point, ResolvedCreateNode, Update } from '../../shared/mutations'
import { withSystemWrite } from '../../design-system/styling'
import type { SubgraphPayload } from '../../shared/subgraph'
import { buildCreate, DOODLE, footprint, styleFor, type Placement } from './build'
import { groupOffset, type Rect } from './placement'
import { arrangePlan } from './arrange'
import { findDiagram } from '../subgraph/structure'
import { edgeStyle, SHEET_HEADER, SHEET_PAD } from './layout'
import { measureNode } from './measure'

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

export interface ConnectStyle {
  label?: string | undefined
  kind?: 'arc' | 'elbow'
  arrow?: 'end' | 'none' | 'both' | undefined
  dashed?: boolean | undefined
  bend?: number
  color?: string | undefined
  size?: 's' | 'm' | 'l' | 'xl' | undefined
  /** Pontas explícitas (ex.: linha-guia com bolinha na ilustração). */
  heads?: { start: 'none' | 'arrow' | 'dot'; end: 'none' | 'arrow' | 'dot' } | undefined
  /** Âncoras normalizadas (0..1) nas bordas: conectores ortogonais limpos em árvores e fluxos. */
  anchors?: { start: { x: number; y: number }; end: { x: number; y: number } } | undefined
}

export function connect(editor: Editor, ds: DesignSystem, from: TLShapeId, to: TLShapeId, style: ConnectStyle = {}) {
  const id = createShapeId()
  const { props, meta } = styleFor(ds, 'arrow', 'connector', { dash: style.dashed ? 'dashed' : undefined, color: style.color, size: style.size })
  const arrow = style.arrow ?? 'end'
  editor.createShape({
    id, type: 'arrow', x: 0, y: 0, meta, parentId: editor.getCurrentPageId(),
    props: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      ...props,
      kind: style.kind ?? 'arc',
      bend: style.bend ?? 0,
      arrowheadStart: style.heads?.start ?? (arrow === 'both' ? 'arrow' : 'none'),
      arrowheadEnd: style.heads?.end ?? (arrow === 'none' ? 'none' : 'arrow'),
      ...(style.label ? { richText: toRichText(style.label) } : {}),
    },
  } as TLShapePartial<TLArrowShape>)
  const anchor = (a?: { x: number; y: number }, exact = false) => ({ normalizedAnchor: a ?? { x: 0.5, y: 0.5 }, isExact: exact, isPrecise: Boolean(a) })
  editor.createBindings<TLArrowBinding>([
    { type: 'arrow', fromId: id, toId: from, props: { terminal: 'start', ...anchor(style.anchors?.start) } },
    // Linha-guia: a ponta entra na ilustração até a parte (não para na borda).
    { type: 'arrow', fromId: id, toId: to, props: { terminal: 'end', ...anchor(style.anchors?.end, style.heads?.end === 'dot') } },
  ])
  return id
}

/** Arco "para fora" entre nós consecutivos de um ciclo (círculo visual). */
function cycleBend(editor: Editor, from: TLShapeId, to: TLShapeId): number {
  const a = editor.getShapePageBounds(from)
  const b = editor.getShapePageBounds(to)
  if (!a || !b) return 0
  return -Math.hypot(b.center.x - a.center.x, b.center.y - a.center.y) * 0.18
}

/** Bend do arco do tldraw para que a curva passe por `via` (bend > 0 curva para a normal esquerda). */
function bendThrough(editor: Editor, from: TLShapeId, to: TLShapeId, via: { x: number; y: number }): number {
  const a = editor.getShapePageBounds(from)?.center
  const b = editor.getShapePageBounds(to)?.center
  if (!a || !b) return 0
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const nx = -(b.y - a.y) / len
  const ny = (b.x - a.x) / len
  const d = (via.x - (a.x + b.x) / 2) * nx + (via.y - (a.y + b.y) / 2) * ny
  return Math.abs(d) < 4 ? 0 : d
}

/** Move nós existentes para as posições recalculadas (top-left de página). */
function moveExisting(editor: Editor, moves: Map<string, { x: number; y: number }>) {
  const updates: TLShapePartial[] = []
  for (const [id, to] of moves) {
    const shape = editor.getShape(asId(id))
    const b = shape ? editor.getShapePageBounds(shape) : undefined
    if (!shape || !b || shape.parentId !== editor.getCurrentPageId()) continue
    updates.push({ id: shape.id, type: shape.type, x: shape.x + (to.x - b.x), y: shape.y + (to.y - b.y) })
  }
  if (updates.length) editor.updateShapes(updates)
}

/** Afasta horizontalmente o que estiver dentro da nova área do diagrama (mesmo lado em que estava). */
function makeRoom(editor: Editor, area: Rect, members: Set<string>, gap = 60) {
  const cx = area.x + area.w / 2
  const updates: TLShapePartial[] = []
  for (const s of editor.getCurrentPageShapes()) {
    if (s.type === 'arrow' || members.has(s.id) || s.parentId !== editor.getCurrentPageId()) continue
    const b = editor.getShapePageBounds(s)
    if (!b) continue
    const hit = b.x < area.x + area.w + gap && b.x + b.w + gap > area.x && b.y < area.y + area.h + gap && b.y + b.h + gap > area.y
    if (!hit) continue
    const dx = b.center.x >= cx ? area.x + area.w + gap - b.x : area.x - gap - (b.x + b.w)
    updates.push({ id: s.id, type: s.type, x: s.x + dx })
  }
  if (updates.length) editor.updateShapes(updates)
}

/** Linha-guia: sai da borda do rótulo voltada à ilustração e entra nela na altura do rótulo. */
function leaderAnchors(editor: Editor, item: TLShapeId, hero: TLShapeId) {
  const a = editor.getShapePageBounds(item)
  const h = editor.getShapePageBounds(hero)
  if (!a || !h) return undefined
  const left = a.center.x < h.center.x
  const y = Math.min(0.88, Math.max(0.12, (a.center.y - h.y) / h.h))
  return { start: { x: left ? 1 : 0, y: 0.5 }, end: { x: left ? 0.32 : 0.68, y } }
}

/** Cartão de seção da folha de estudo (tracejado, cor da seção) + cabeçalho em pílula. */
function sheetSection(editor: Editor, ds: DesignSystem, c: ResolvedCreateNode, dx: number, color: string): TLShapeId[] {
  const x = c.x + dx
  const y = c.y
  const w = c.w ?? 320
  const h = c.h ?? 200
  const card = createShapeId()
  const cardStyle = styleFor(ds, 'geo', 'container', { color, dash: 'dashed', fill: 'none', size: 's' })
  editor.createShape({
    id: card, type: 'geo', x, y, parentId: editor.getCurrentPageId(), meta: cardStyle.meta,
    props: { geo: 'rectangle', w, h, richText: toRichText(''), ...cardStyle.props },
  } as TLShapePartial<TLGeoShape>)
  const header = createShapeId()
  // fill "solid" no tldraw = tom pastel da cor ("semi" é o branco translúcido da UI).
  const headStyle = styleFor(ds, 'geo', 'heading', { color, fill: 'solid', size: 'm' })
  const label = c.text.trim()
  const m = measureNode(editor, { ...c, kind: 'geo', w: undefined, h: undefined }, { size: 'm', font: headStyle.props.font }, 'heading')
  const hw = Math.min(w - SHEET_PAD * 2, Math.max(120, m?.w ?? label.length * 11 + 48))
  editor.createShape({
    id: header, type: 'geo', x: x + SHEET_PAD - 4, y: y + SHEET_PAD - 8, parentId: editor.getCurrentPageId(), meta: headStyle.meta,
    props: { geo: 'rectangle', w: hw, h: SHEET_HEADER - 6, richText: toRichText(label), ...headStyle.props },
  } as TLShapePartial<TLGeoShape>)
  return [card, header]
}

const axisOf = (type: string, direction?: string): 'x' | 'y' =>
  type === 'mindmap' || direction === 'right' ? 'x' : 'y'

/** Sai pela borda voltada ao destino e entra pela borda oposta (eixo principal do layout). */
function sideAnchors(editor: Editor, from: TLShapeId, to: TLShapeId, axis: 'x' | 'y') {
  const a = editor.getShapePageBounds(from)
  const b = editor.getShapePageBounds(to)
  if (!a || !b) return undefined
  if (axis === 'x') {
    const right = b.center.x >= a.center.x
    return { start: { x: right ? 1 : 0, y: 0.5 }, end: { x: right ? 0 : 1, y: 0.5 } }
  }
  const down = b.center.y >= a.center.y
  return { start: { x: 0.5, y: down ? 1 : 0 }, end: { x: 0.5, y: down ? 0 : 1 } }
}

export function occupiedRects(editor: Editor): Rect[] {
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

export interface ApplyOptions {
  /** Traços dos doodles do plano, já carregados (nome dado no plano → traços no grid 24×24). */
  doodles?: Map<string, Point[][]>
}

/** Desenha um doodle como traços à mão livre agrupados (um objeto só no canvas). */
function drawDoodle(editor: Editor, ds: DesignSystem, c: ResolvedCreateNode, strokes: Point[][], at: { x: number; y: number }, parentId: TLParentId) {
  const w = c.w ?? DOODLE.w
  const h = c.h ?? DOODLE.h
  const scale = Math.min(w, h) / 24
  const ox = at.x + (w - 24 * scale) / 2
  const oy = at.y + (h - 24 * scale) / 2
  const { props, meta } = styleFor(ds, 'draw', c.role ?? 'primary', { color: c.color, size: c.size ?? (w <= 96 ? 's' : 'm') })
  delete (props as Record<string, unknown>)['fill']
  const ids: TLShapeId[] = []
  for (const stroke of strokes) {
    const o = stroke[0]!
    const id = createShapeId()
    editor.createShape({
      id, type: 'draw', parentId, meta,
      x: ox + o.x * scale, y: oy + o.y * scale,
      props: {
        segments: compressLegacySegments([{ type: 'free', points: stroke.map((p) => ({ x: (p.x - o.x) * scale, y: (p.y - o.y) * scale, z: 0.5 })) }]),
        isComplete: true,
        isClosed: false,
        ...props,
      },
    } as TLShapePartial<TLDrawShape>)
    ids.push(id)
  }
  if (ids.length < 2) return ids[0] ?? null
  const groupId = createShapeId()
  editor.groupShapes(ids, { groupId, select: false })
  return groupId
}

/** Aplica o plano numa única transação de histórico (1 Ctrl+Z desfaz tudo). */
export function applyPlan(
  editor: Editor,
  plan: MutationPlan,
  subgraph: SubgraphPayload,
  ds: DesignSystem,
  opts: ApplyOptions = {},
): ApplyResult {
  // Respostas antigas/mocks sem layout: posições do próprio plano.
  plan = { ...plan, layout: plan.layout ?? { type: 'free' } }
  const created: TLShapeId[] = []
  const imageSlots: TLShapeId[] = []
  editor.markHistoryStoppingPoint('reif:ai-transform')

  withSystemWrite(() => editor.run(() => {
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

    // LAYOUT: estrutura do plano → posições (medidas reais do texto, algoritmo do tipo pedido)
    // Regeração: raiz é um nó existente dentro de um diagrama hierárquico → estende o diagrama todo.
    const rootId = plan.layout.type !== 'free' ? plan.layout.root : undefined
    const existing = rootId && editor.getShape(asId(rootId)) ? findDiagram(editor, rootId) : null
    const arranged = arrangePlan(editor, plan, subgraph, ds, existing)
    if (arranged.moves?.size) moveExisting(editor, arranged.moves)
    if (arranged.footprintAll && existing) makeRoom(editor, arranged.footprintAll, new Set(existing.nodes.keys()))

    // CREATE: composição deslocada como bloco; frames antes dos filhos
    const dx = arranged.pinned ? 0 : groupOffset(arranged.create.map(footprint), occupiedRects(editor))
    const ordered = [...arranged.create].sort((a, b) => Number(b.kind === 'frame') - Number(a.kind === 'frame'))
    const refs = new Map<string, TLShapeId>()
    const frames = new Map<string, Placement['parent']>()

    const isSheet = plan.layout.type === 'sheet'
    const sections = new Map<string, TLShapeId[]>()
    for (const c of ordered) {
      const id = createShapeId()
      if (isSheet && c.kind === 'frame') {
        // Seção da folha: cartão tracejado + cabeçalho em pílula (agrupados com os filhos no fim).
        sections.set(c.ref, sheetSection(editor, ds, c, dx, arranged.branch.get(c.ref) ?? 'violet'))
        continue
      }
      const parent = c.frame ? frames.get(c.frame) : undefined
      const tint = arranged.branch.get(c.ref)
      const node = tint && !c.color && c.kind !== 'frame' ? { ...c, color: tint } : c
      if (c.kind === 'doodle') {
        const strokes = opts.doodles?.get(c.icon ?? '')
        const at = parent ? { x: c.x + dx - parent.x, y: c.y - parent.y } : { x: c.x + dx, y: c.y }
        const gid = strokes?.length ? drawDoodle(editor, ds, node, strokes, at, parent ? parent.id : editor.getCurrentPageId()) : null
        if (gid) {
          refs.set(c.ref, gid)
          if (!parent) created.push(gid)
        }
        continue
      }
      const partial = buildCreate(node, { id, ds, dx, pageId: editor.getCurrentPageId(), align: arranged.align.get(c.ref), ...(parent ? { parent } : {}) })
      if (!partial) continue
      editor.createShape(partial)
      refs.set(c.ref, id)
      if (c.kind === 'frame') frames.set(c.ref, { id, x: c.x + dx, y: c.y })
      if (c.kind === 'image') imageSlots.push(id)
      if (!parent) created.push(id)
    }
    // Agrupa cada seção da folha (cartão + cabeçalho + conteúdo) num objeto só.
    for (const [ref, own] of sections) {
      const members = [...own, ...plan.create.filter((k) => k.frame === ref).flatMap((k) => refs.get(k.ref) ?? [])]
      const groupId = createShapeId()
      if (members.length > 1) editor.groupShapes(members, { groupId, select: false })
      for (const m of members) {
        const i = created.indexOf(m)
        if (i >= 0) created.splice(i, 1)
      }
      created.push(members.length > 1 ? groupId : own[0]!)
    }

    // CONNECT
    const resolve = (key: string) => refs.get(key) ?? (editor.getShape(asId(key)) ? asId(key) : null)
    const type = arranged.layout?.type ?? plan.layout.type
    const direction = arranged.layout?.direction ?? plan.layout.direction
    plan.connect.forEach((c, i) => {
      const from = resolve(c.from)
      const to = resolve(c.to)
      if (!from || !to) return
      // Na linha do tempo as setas só definem a ordem; o eixo desenhado abaixo as substitui.
      if (arranged.spine && refs.has(c.from) && refs.has(c.to) && c.arrow !== 'none' && !c.dashed) return
      if (type === 'labeled') {
        // Só as linhas-guia (rótulo → ilustração); ligações rótulo→descrição só agrupam.
        const hero = arranged.rootRef ? resolve(arranged.rootRef) : null
        if (!hero || (from !== hero && to !== hero)) return
        const item = from === hero ? to : from
        created.push(connect(editor, ds, item, hero, { kind: 'arc', size: 's', heads: { start: 'none', end: 'dot' }, anchors: leaderAnchors(editor, item, hero), dashed: c.dashed }))
        return
      }
      const base = edgeStyle(type, Boolean(c.label))
      let kind = base.kind
      let bend = type === 'cycle' ? cycleBend(editor, from, to) : 0
      const via = arranged.edgeVia.get(i)
      if (type === 'flow' && via && (c.label || !arranged.shortEdges.has(i))) {
        // Ligação longa ou rotulada: curva pela rota do dagre (desvia dos nós, rótulo no espaço reservado).
        kind = 'arc'
        bend = bendThrough(editor, from, to, { x: via.x + dx, y: via.y })
      }
      created.push(
        connect(editor, ds, from, to, {
          label: c.label,
          kind,
          arrow: c.arrow ?? base.arrow,
          dashed: c.dashed,
          color: arranged.branch.get(c.to) ?? arranged.branch.get(c.from),
          bend,
          anchors: kind === 'elbow' ? sideAnchors(editor, from, to, axisOf(type, direction)) : undefined,
        }),
      )
    })

    // TIMELINE: eixo + marcador por evento + haste até o cartão.
    if (arranged.spine) {
      const sp = arranged.spine
      const pageId = editor.getCurrentPageId()
      const shift = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y })
      const extra: ResolvedCreateNode[] = [
        { ref: 'spine', kind: 'line', text: '', x: 0, y: 0, points: [sp.from, sp.to], role: 'connector', size: 'l' },
        ...sp.marks.map((m, k): ResolvedCreateNode => ({
          ref: `tick${k}`, kind: 'line', text: '', x: 0, y: 0, points: [m.at, m.card], role: 'muted',
        })),
        ...sp.marks.map((m, k): ResolvedCreateNode => ({
          ref: `dot${k}`, kind: 'geo', geo: 'ellipse', text: '', x: m.at.x - 8, y: m.at.y - 8, w: 16, h: 16, points: [], role: 'accent',
        })),
      ]
      for (const e of extra) {
        const node = e.kind === 'line' ? { ...e, points: e.points.map(shift) } : { ...e, x: e.x }
        const id = createShapeId()
        const partial = buildCreate(node, { id, ds, dx: e.kind === 'line' ? 0 : dx, pageId })
        if (!partial) continue
        editor.createShape(partial)
        created.push(id)
      }
    }

    // Marca a raiz do diagrama novo (tipo de layout) para regerações futuras.
    const newRoot = plan.layout.root ? refs.get(plan.layout.root) : undefined
    const rootShape = newRoot ? editor.getShape(newRoot) : undefined
    if (rootShape && (type === 'mindmap' || type === 'tree')) {
      const meta = rootShape.meta as { reif?: Record<string, unknown> }
      editor.updateShape({
        id: rootShape.id,
        type: rootShape.type,
        meta: { ...rootShape.meta, reif: { ...(meta.reif ?? {}), layoutRoot: true, layout: type, direction: direction ?? 'down' } },
      })
    }

    if (created.length) editor.select(...created)
  }))

  return { created, imageSlots }
}
