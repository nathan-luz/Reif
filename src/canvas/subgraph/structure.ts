import type { Editor, TLArrowBinding, TLArrowShape, TLShape, TLShapeId } from 'tldraw'
import type { BoardContext } from '../../shared/subgraph'

/**
 * Estrutura de um diagrama já existente no board, reconstruída a partir das setas:
 * componente conexo, raiz, hierarquia e tipo de layout. Base da "regeração": expandir
 * um nó de um mapa mental mantendo o todo organizado, e dar ao LLM o contexto do board.
 */

export interface ExistingNode {
  id: string
  kind: string
  x: number
  y: number
  w: number
  h: number
  text: string
  role?: string | undefined
  /** Cor definida explicitamente (ex.: cor do ramo), herdada pelos filhos novos. */
  color?: string | undefined
}

export interface ExistingDiagram {
  rootId: string
  type: 'mindmap' | 'tree'
  direction: 'down' | 'right'
  nodes: Map<string, ExistingNode>
  /** Arestas pai→filho da hierarquia, filhos na ordem visual atual. */
  edges: { from: string; to: string }[]
  parent: Map<string, string>
  depth: Map<string, number>
}

const isArrow = (s: TLShape): s is TLArrowShape => s.type === 'arrow'
const textOf = (editor: Editor, s: TLShape) => (editor.getShapeUtil(s).getText(s) ?? (s.type === 'frame' ? (s.props as { name?: string }).name : '') ?? '').trim()

interface ReifMetaLike {
  reif?: { role?: string; overrides?: string[]; layout?: string; layoutRoot?: boolean; direction?: string }
}

/** Grafo das setas ligadas nas duas pontas (não dirigido para conexidade). */
function arrowGraph(editor: Editor) {
  const adj = new Map<string, Set<string>>()
  const add = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set())
    adj.get(a)!.add(b)
  }
  for (const s of editor.getCurrentPageShapes()) {
    if (!isArrow(s)) continue
    const ends = editor.getBindingsFromShape<TLArrowBinding>(s, 'arrow')
    const from = ends.find((e) => e.props.terminal === 'start')?.toId
    const to = ends.find((e) => e.props.terminal === 'end')?.toId
    if (!from || !to || from === to) continue
    add(from, to)
    add(to, from)
  }
  return adj
}

export function findDiagram(editor: Editor, shapeId: string): ExistingDiagram | null {
  const adj = arrowGraph(editor)
  if (!adj.has(shapeId)) return null
  // Componente conexo
  const comp = new Set<string>([shapeId])
  const queue = [shapeId]
  while (queue.length) {
    for (const n of adj.get(queue.shift()!) ?? []) {
      if (comp.has(n)) continue
      comp.add(n)
      queue.push(n)
    }
  }
  if (comp.size < 2) return null

  const nodes = new Map<string, ExistingNode>()
  for (const id of comp) {
    const s = editor.getShape(id as TLShapeId)
    const b = s ? editor.getShapePageBounds(s) : undefined
    if (!s || !b || s.parentId !== editor.getCurrentPageId()) continue
    const meta = (s.meta as ReifMetaLike).reif
    const color = (s.props as { color?: string }).color
    nodes.set(id, {
      id, kind: s.type, x: b.x, y: b.y, w: b.w, h: b.h, text: textOf(editor, s), role: meta?.role,
      color: color && !color.startsWith('ds-') ? color : undefined,
    })
  }
  if (nodes.size < 2) return null

  // Raiz: marcada no meta; senão o destaque (accent); senão o de maior grau.
  const metaOf = (id: string) => (editor.getShape(id as TLShapeId)?.meta as ReifMetaLike | undefined)?.reif
  const list = [...nodes.values()]
  const degree = (id: string) => [...(adj.get(id) ?? [])].filter((n) => nodes.has(n)).length
  const rootId =
    list.find((n) => metaOf(n.id)?.layoutRoot)?.id ??
    [...list].sort((a, b) => Number(b.role === 'accent') - Number(a.role === 'accent') || degree(b.id) - degree(a.id))[0]!.id

  // Hierarquia por BFS a partir da raiz
  const parent = new Map<string, string>()
  const depth = new Map<string, number>([[rootId, 0]])
  const bfs = [rootId]
  while (bfs.length) {
    const id = bfs.shift()!
    for (const n of adj.get(id) ?? []) {
      if (!nodes.has(n) || depth.has(n)) continue
      depth.set(n, depth.get(id)! + 1)
      parent.set(n, id)
      bfs.push(n)
    }
  }

  // Tipo: meta da raiz; senão inferido pela geometria dos filhos da raiz.
  const root = nodes.get(rootId)!
  const rc = { x: root.x + root.w / 2, y: root.y + root.h / 2 }
  const kids = [...parent.entries()].filter(([, p]) => p === rootId).map(([k]) => nodes.get(k)!)
  const stored = metaOf(rootId)
  let type: ExistingDiagram['type'] | null = stored?.layout === 'mindmap' || stored?.layout === 'tree' ? stored.layout : null
  let direction: ExistingDiagram['direction'] = stored?.direction === 'right' ? 'right' : 'down'
  if (!type && kids.length) {
    const dx = kids.map((k) => k.x + k.w / 2 - rc.x)
    const dy = kids.map((k) => k.y + k.h / 2 - rc.y)
    const horizontal = kids.every((_, i) => Math.abs(dx[i]!) > Math.abs(dy[i]!) * 0.6)
    if (horizontal && dx.some((d) => d > 0) && dx.some((d) => d < 0)) type = 'mindmap'
    else if (horizontal && dx.every((d) => d > 0)) {
      type = 'tree'
      direction = 'right'
    } else if (dy.every((d) => d > 0)) {
      type = 'tree'
      direction = 'down'
    }
  }
  if (!type) return null

  // Filhos na ordem visual (de cima para baixo nos layouts horizontais).
  const axis = type === 'mindmap' || direction === 'right' ? 'y' : 'x'
  const pos = (id: string) => {
    const n = nodes.get(id)!
    return axis === 'y' ? n.y + n.h / 2 : n.x + n.w / 2
  }
  const edges = [...parent.entries()].sort((a, b) => pos(a[0]) - pos(b[0])).map(([to, from]) => ({ from, to }))
  return { rootId, type, direction, nodes, edges, parent, depth }
}

/**
 * Contexto do board para o LLM entender pedidos curtos ("desta matéria"): tema do
 * diagrama, caminho até o nó selecionado, irmãos e filhos já existentes, e os títulos
 * e textos principais do resto do board.
 */
export function boardContext(editor: Editor, selectedIds: string[]): BoardContext | undefined {
  const sel = new Set(selectedIds)
  const ctx: BoardContext = {}
  const first = selectedIds[0]
  const diagram = first ? findDiagram(editor, first) : null
  if (diagram && first && diagram.nodes.has(first)) {
    const path: string[] = []
    for (let id: string | undefined = first; id; id = diagram.parent.get(id)) path.unshift(diagram.nodes.get(id)?.text ?? '')
    const p = diagram.parent.get(first)
    const childrenOf = (id: string) => diagram.edges.filter((e) => e.from === id).map((e) => diagram.nodes.get(e.to)?.text ?? '')
    ctx.diagram = {
      layout: diagram.type,
      topic: diagram.nodes.get(diagram.rootId)?.text ?? '',
      path: path.filter(Boolean),
      depth: diagram.depth.get(first) ?? 0,
      siblings: p ? childrenOf(p).filter((t) => t !== diagram.nodes.get(first)?.text) : [],
      existingChildren: childrenOf(first),
      branches: childrenOf(diagram.rootId),
    }
  }
  // Textos de destaque do board (títulos, raízes, nós principais), fora da seleção.
  const board = editor
    .getCurrentPageShapes()
    .filter((s) => !isArrow(s) && !sel.has(s.id))
    .map((s) => ({ s, role: (s.meta as ReifMetaLike).reif?.role, text: textOf(editor, s) }))
    .filter((x) => x.text && x.text.length <= 120)
    .sort((a, b) => rank(a.role) - rank(b.role))
    .slice(0, 25)
    .map((x) => x.text)
  if (board.length) ctx.board = board
  return ctx.diagram || ctx.board ? ctx : undefined
}

const RANK: Record<string, number> = { title: 0, accent: 1, heading: 2, primary: 3, container: 4, secondary: 5 }
const rank = (role?: string) => RANK[role ?? ''] ?? 9
