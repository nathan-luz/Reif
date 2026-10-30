import dagre from '@dagrejs/dagre'
import type { Layout, LayoutType } from '../../shared/mutations'
import { unionRect, type Rect } from './placement'

/**
 * Layout determinístico dos diagramas gerados por prompt.
 *
 * O LLM descreve a ESTRUTURA (nós, ligações, raiz, tipo de diagrama); as coordenadas
 * saem daqui. LLMs erram coordenadas (sobreposição, espaçamento irregular, setas
 * cruzando tudo); algoritmos clássicos não: árvore arrumada, mapa mental balanceado,
 * camadas de grafo dirigido (dagre/Sugiyama), anéis radiais, ciclo, linha do tempo,
 * colunas e grade. Funções puras: recebem tamanhos, devolvem retângulos (top-left).
 */

export interface LNode {
  id: string
  kind: string
  w: number
  h: number
  role?: string | undefined
  /** id do frame (também participante) que contém este nó. */
  frame?: string | undefined
}

export interface LEdge {
  from: string
  to: string
  label?: string | undefined
  /** Ligação secundária (sem ponta ou tracejada): anotação/associação, não define sequência. */
  weak?: boolean | undefined
}

export interface LayoutInput extends Layout {
  nodes: LNode[]
  edges: LEdge[]
  /** Espaçamento base (o design system ativo define). */
  gap: number
  /** mindmap: lado fixo de ramos já existentes (regeração estável: nada troca de lado). */
  sides?: Map<string, 1 | -1> | undefined
}

export interface Pt {
  x: number
  y: number
}

/** Eixo de linha do tempo: segmento + um marcador por evento ligado ao cartão. */
export interface Spine {
  from: Pt
  to: Pt
  marks: { id: string; at: Pt; card: Pt }[]
}

export interface LayoutOutput {
  boxes: Map<string, Rect>
  /** Novos tamanhos (frames embrulhando filhos, cartões uniformizados). */
  resized: Set<string>
  /** flow: ponto médio da rota do dagre por índice de ligação (curva desvia de nós no caminho). */
  edgeVia: Map<number, Pt>
  /** flow: ligações entre camadas vizinhas (podem ser ortogonais). */
  shortEdges: Set<number>
  /** timeline: eixo desenhado (as setas do plano só definem a ordem). */
  spine?: Spine
}

const TITLE_ROLES = new Set(['title', 'heading'])

interface Ctx {
  byId: Map<string, LNode>
  gap: number
  boxes: Map<string, Rect>
  resized: Set<string>
  edgeVia: Map<number, Pt>
  shortEdges: Set<number>
  spine?: Spine
}

const put = (ctx: Ctx, id: string, cx: number, cy: number) => {
  const n = ctx.byId.get(id)
  if (n) ctx.boxes.set(id, { x: cx - n.w / 2, y: cy - n.h / 2, w: n.w, h: n.h })
}

/** Adjacência não dirigida, preservando a ordem das ligações (ordem de leitura do LLM). */
function adjacency(nodes: LNode[], edges: LEdge[]) {
  const ids = new Set(nodes.map((n) => n.id))
  const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]))
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue
    adj.get(e.from)!.push(e.to)
    adj.get(e.to)!.push(e.from)
  }
  return adj
}

/** Árvore geradora por BFS a partir da raiz (filhos na ordem das ligações). */
export function spanningTree(root: string, nodes: LNode[], edges: LEdge[]) {
  const adj = adjacency(nodes, edges)
  const children = new Map<string, string[]>()
  const depth = new Map<string, number>([[root, 0]])
  const queue = [root]
  while (queue.length) {
    const id = queue.shift()!
    const kids: string[] = []
    for (const next of adj.get(id) ?? []) {
      if (depth.has(next)) continue
      depth.set(next, depth.get(id)! + 1)
      kids.push(next)
      queue.push(next)
    }
    children.set(id, kids)
  }
  return { children, depth }
}

/** Raiz: a indicada; senão o título/destaque mais conectado; senão o de maior grau. */
export function pickRoot(input: Pick<LayoutInput, 'root' | 'nodes' | 'edges'>, pool: LNode[]): string | undefined {
  if (input.root && pool.some((n) => n.id === input.root)) return input.root
  const degree = new Map<string, number>()
  for (const e of input.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const score = (n: LNode) => (degree.get(n.id) ?? 0) * 10 + (n.role === 'accent' || n.role === 'title' ? 5 : 0)
  return [...pool].sort((a, b) => score(b) - score(a))[0]?.id
}

// ── Árvore arrumada (Reingold–Tilford simplificado, sem compactação de contornos) ──
function tidyTree(ctx: Ctx, root: string, children: Map<string, string[]>, dir: 'down' | 'right', levelGap: number, sibGap: number) {
  const cross = (id: string) => (dir === 'down' ? ctx.byId.get(id)!.w : ctx.byId.get(id)!.h)
  const main = (id: string) => (dir === 'down' ? ctx.byId.get(id)!.h : ctx.byId.get(id)!.w)
  const breadth = new Map<string, number>()
  const measure = (id: string): number => {
    const kids = children.get(id) ?? []
    const sum = kids.reduce((s, k) => s + measure(k), 0) + sibGap * Math.max(0, kids.length - 1)
    const b = Math.max(cross(id), sum)
    breadth.set(id, b)
    return b
  }
  measure(root)
  // Tamanho máximo por nível no eixo principal → níveis alinhados.
  const levelSize: number[] = []
  const walkLevels = (id: string, d: number) => {
    levelSize[d] = Math.max(levelSize[d] ?? 0, main(id))
    for (const k of children.get(id) ?? []) walkLevels(k, d + 1)
  }
  walkLevels(root, 0)
  const levelStart: number[] = [0]
  for (let d = 1; d < levelSize.length; d++) levelStart[d] = levelStart[d - 1]! + levelSize[d - 1]! + levelGap

  const place = (id: string, start: number, d: number) => {
    const b = breadth.get(id)!
    const kids = children.get(id) ?? []
    const c = start + b / 2
    // Em "down" os nós de um nível ficam centrados na faixa; em "right", alinhados à esquerda (leitura).
    const m = dir === 'down' ? levelStart[d]! + levelSize[d]! / 2 : levelStart[d]! + main(id) / 2
    if (dir === 'down') put(ctx, id, c, m)
    else put(ctx, id, m, c)
    const total = kids.reduce((s, k) => s + breadth.get(k)!, 0) + sibGap * Math.max(0, kids.length - 1)
    let cursor = start + (b - total) / 2
    for (const k of kids) {
      place(k, cursor, d + 1)
      cursor += breadth.get(k)! + sibGap
    }
  }
  place(root, 0, 0)
}

// ── Mapa mental: raiz central, ramos de 1º nível divididos entre direita e esquerda ──
function mindmap(ctx: Ctx, root: string, children: Map<string, string[]>, sides?: Map<string, 1 | -1>) {
  const { gap } = ctx
  const rootNode = ctx.byId.get(root)!
  put(ctx, root, 0, 0)
  const branches = children.get(root) ?? []
  const sibGap = Math.round(gap * 0.35)
  const branchGap = Math.round(gap * 0.6)
  const firstGap = Math.round(gap * 1.6)
  const levelGap = Math.round(gap * 0.9)

  const breadth = new Map<string, number>()
  const measure = (id: string): number => {
    const kids = children.get(id) ?? []
    const sum = kids.reduce((s, k) => s + measure(k), 0) + sibGap * Math.max(0, kids.length - 1)
    const b = Math.max(ctx.byId.get(id)!.h, sum)
    breadth.set(id, b)
    return b
  }
  const total = branches.reduce((s, b) => s + measure(b), 0)
  // Ordem preservada: os primeiros ramos à direita (leitura em sentido horário), o resto à esquerda.
  let right: string[]
  let left: string[]
  if (sides?.size) {
    // Regeração: ramos existentes ficam do lado em que estão; novos vão para o lado mais leve.
    right = branches.filter((b) => sides.get(b) === 1)
    left = branches.filter((b) => sides.get(b) === -1)
    const weight = (l: string[]) => l.reduce((s, b) => s + breadth.get(b)!, 0)
    for (const b of branches.filter((x) => !sides.has(x))) (weight(right) <= weight(left) ? right : left).push(b)
  } else {
    let k = 0
    let acc = 0
    while (k < branches.length - 1 && acc + breadth.get(branches[k]!)! / 2 < total / 2) acc += breadth.get(branches[k++]!)!
    right = branches.slice(0, Math.max(1, k))
    left = branches.slice(Math.max(1, k))
  }

  const side = (list: string[], sign: 1 | -1) => {
    // Larguras máximas por profundidade neste lado → colunas alinhadas.
    const colW: number[] = []
    const walk = (id: string, d: number) => {
      colW[d] = Math.max(colW[d] ?? 0, ctx.byId.get(id)!.w)
      for (const k of children.get(id) ?? []) walk(k, d + 1)
    }
    for (const b of list) walk(b, 1)
    const colStart: number[] = []
    colStart[1] = rootNode.w / 2 + firstGap
    for (let d = 2; d < colW.length; d++) colStart[d] = colStart[d - 1]! + colW[d - 1]! + levelGap

    const place = (id: string, top: number, d: number) => {
      const n = ctx.byId.get(id)!
      const b = breadth.get(id)!
      const x = sign === 1 ? colStart[d]! + n.w / 2 : -(colStart[d]! + n.w / 2)
      put(ctx, id, x, top + b / 2)
      const kids = children.get(id) ?? []
      const sum = kids.reduce((s, k) => s + breadth.get(k)!, 0) + sibGap * Math.max(0, kids.length - 1)
      let cursor = top + (b - sum) / 2
      for (const k of kids) {
        place(k, cursor, d + 1)
        cursor += breadth.get(k)! + sibGap
      }
    }
    const height = list.reduce((s, b) => s + breadth.get(b)!, 0) + branchGap * Math.max(0, list.length - 1)
    let cursor = -height / 2
    for (const b of list) {
      place(b, cursor, 1)
      cursor += breadth.get(b)! + branchGap
    }
  }
  side(right, 1)
  side(left, -1)
}

// ── Radial (hub-and-spoke em anéis; fatia angular proporcional às folhas) ──
function radial(ctx: Ctx, root: string, children: Map<string, string[]>, depth: Map<string, number>) {
  const { gap } = ctx
  const diag = (id: string) => {
    const n = ctx.byId.get(id)!
    return Math.hypot(n.w, n.h)
  }
  const leaves = new Map<string, number>()
  const count = (id: string): number => {
    const kids = children.get(id) ?? []
    const c = kids.length ? kids.reduce((s, k) => s + count(k), 0) : 1
    leaves.set(id, c)
    return c
  }
  count(root)
  const levels: string[][] = []
  for (const [id, d] of depth) (levels[d] ??= []).push(id)
  const radius: number[] = [0]
  for (let d = 1; d < levels.length; d++) {
    const ids = levels[d] ?? []
    const maxPrev = Math.max(...(levels[d - 1] ?? [root]).map(diag))
    const maxHere = Math.max(...ids.map(diag))
    const byStep = radius[d - 1]! + maxPrev / 2 + maxHere / 2 + gap
    const byCircumference = (ids.reduce((s, id) => s + diag(id), 0) + gap * ids.length) / (2 * Math.PI)
    radius[d] = Math.max(byStep, byCircumference)
  }
  put(ctx, root, 0, 0)
  const place = (id: string, from: number, span: number) => {
    const kids = children.get(id) ?? []
    let a = from
    for (const k of kids) {
      const s = (span * leaves.get(k)!) / leaves.get(id)!
      const mid = a + s / 2
      const r = radius[depth.get(k)!]!
      put(ctx, k, r * Math.cos(mid), r * Math.sin(mid))
      place(k, a, s)
      a += s
    }
  }
  place(root, -Math.PI / 2 - Math.PI / Math.max(1, (children.get(root) ?? []).length), 2 * Math.PI)
}

/** Ordem de leitura: segue as setas a partir de quem não tem predecessor; depois o resto. */
export function sequence(nodes: LNode[], edges: LEdge[]): string[] {
  const ids = nodes.map((n) => n.id)
  const set = new Set(ids)
  const next = new Map<string, string>()
  const indeg = new Map<string, number>()
  for (const e of edges) {
    if (!set.has(e.from) || !set.has(e.to)) continue
    if (!next.has(e.from)) next.set(e.from, e.to)
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1)
  }
  const out: string[] = []
  const seen = new Set<string>()
  const follow = (start: string) => {
    let cur: string | undefined = start
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      out.push(cur)
      cur = next.get(cur)
    }
  }
  const start = ids.find((id) => !indeg.get(id) && next.has(id)) ?? ids[0]
  if (start) follow(start)
  for (const id of ids) follow(id)
  return out
}

function cycle(ctx: Ctx, ring: string[], hub: string | undefined) {
  const { gap } = ctx
  const size = (id: string) => {
    const n = ctx.byId.get(id)!
    return Math.max(n.w, n.h)
  }
  const n = ring.length
  let r = Math.max(gap * 3, (ring.reduce((s, id) => s + size(id), 0) + gap * n) / (2 * Math.PI))
  if (hub) {
    const h = ctx.byId.get(hub)!
    r = Math.max(r, Math.hypot(h.w, h.h) / 2 + Math.max(...ring.map(size)) / 2 + gap)
    put(ctx, hub, 0, 0)
  }
  ring.forEach((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    put(ctx, id, r * Math.cos(a), r * Math.sin(a))
  })
}

/** Anotações ligadas a um nó do anel: para fora, na direção radial desse nó. */
function satellites(ctx: Ctx, ring: string[], nodes: LNode[], edges: LEdge[]) {
  const onRing = new Set(ring)
  const count = new Map<string, number>()
  for (const n of nodes) {
    if (ctx.boxes.has(n.id)) continue
    const e = edges.find((x) => (x.from === n.id && onRing.has(x.to)) || (x.to === n.id && onRing.has(x.from)))
    if (!e) continue
    const anchorId = e.from === n.id ? e.to : e.from
    const a = ctx.boxes.get(anchorId)!
    const k = count.get(anchorId) ?? 0
    count.set(anchorId, k + 1)
    const cx = a.x + a.w / 2
    const cy = a.y + a.h / 2
    const len = Math.hypot(cx, cy) || 1
    const ux = cx / len
    const uy = cy / len
    // Distância até a borda da caixa na direção radial + folga; empilha várias anotações.
    const reach = Math.abs(ux) * (a.w + n.w) / 2 + Math.abs(uy) * (a.h + n.h) / 2 + ctx.gap * 0.6
    const off = k * (n.h + ctx.gap * 0.3)
    put(ctx, n.id, cx + ux * reach - uy * off, cy + uy * reach + ux * off)
  }
}

function timeline(ctx: Ctx, order: string[], dir: 'down' | 'right') {
  const { gap } = ctx
  if (order.length === 0) return
  const reach = Math.round(gap * 0.7)
  if (dir === 'down') {
    // Eixo vertical à esquerda; cartões empilhados à direita.
    let y = 0
    const marks: Spine['marks'] = []
    for (const id of order) {
      const n = ctx.byId.get(id)!
      ctx.boxes.set(id, { x: reach, y, w: n.w, h: n.h })
      marks.push({ id, at: { x: 0, y: y + n.h / 2 }, card: { x: reach, y: y + n.h / 2 } })
      y += n.h + gap * 0.5
    }
    ctx.spine = { from: { x: 0, y: -gap * 0.4 }, to: { x: 0, y: y - gap * 0.1 }, marks }
    return
  }
  // Horizontal: eventos alternam acima/abaixo do eixo (cabe o dobro sem encolher o texto).
  const xs: number[] = []
  order.forEach((id, i) => {
    const w = ctx.byId.get(id)!.w
    let x = 0
    const prev = order[i - 1]
    const prev2 = order[i - 2]
    if (prev !== undefined) x = xs[i - 1]! + Math.max(gap * 0.9, (ctx.byId.get(prev)!.w + w) / 4)
    if (prev2 !== undefined) x = Math.max(x, xs[i - 2]! + (ctx.byId.get(prev2)!.w + w) / 2 + gap * 0.5)
    xs.push(x)
  })
  const marks: Spine['marks'] = []
  order.forEach((id, i) => {
    const n = ctx.byId.get(id)!
    const above = i % 2 === 0
    const top = above ? -reach - n.h : reach
    ctx.boxes.set(id, { x: xs[i]! - n.w / 2, y: top, w: n.w, h: n.h })
    marks.push({ id, at: { x: xs[i]!, y: 0 }, card: { x: xs[i]!, y: above ? -reach : reach } })
  })
  const first = ctx.boxes.get(order[0]!)!
  const last = ctx.boxes.get(order[order.length - 1]!)!
  ctx.spine = { from: { x: first.x - gap * 0.4, y: 0 }, to: { x: last.x + last.w + gap * 0.6, y: 0 }, marks }
}

function flow(ctx: Ctx, nodes: LNode[], edges: LEdge[], dir: 'down' | 'right') {
  const { gap } = ctx
  const ids = new Set(nodes.map((n) => n.id))
  const frames = nodes.filter((n) => n.kind === 'frame')
  const g = new dagre.graphlib.Graph({ compound: frames.length > 0, multigraph: true })
  g.setGraph({ rankdir: dir === 'down' ? 'TB' : 'LR', nodesep: gap, ranksep: Math.round(gap * 1.4), edgesep: 16 })
  g.setDefaultEdgeLabel(() => ({}))
  for (const n of nodes) if (n.kind !== 'frame') g.setNode(n.id, { width: n.w, height: n.h })
  for (const f of frames) g.setNode(f.id, {})
  for (const n of nodes) if (n.frame && ids.has(n.frame) && n.kind !== 'frame') g.setParent(n.id, n.frame)
  edges.forEach((e, i) => {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) return
    if (ctx.byId.get(e.from)?.kind === 'frame' || ctx.byId.get(e.to)?.kind === 'frame') return
    const label = e.label ? { width: Math.min(220, 12 + e.label.length * 9), height: 26, labelpos: 'c' } : {}
    g.setEdge(e.from, e.to, label, `e${i}`)
  })
  dagre.layout(g)
  for (const n of nodes) {
    if (n.kind === 'frame') continue
    const p = g.node(n.id) as { x: number; y: number } | undefined
    if (p) put(ctx, n.id, p.x, p.y)
  }
  edges.forEach((e, i) => {
    const info = g.edge({ v: e.from, w: e.to, name: `e${i}` }) as { points?: Pt[]; x?: number; y?: number } | undefined
    const pts = info?.points
    if (!info || !pts?.length) return
    // Rótulo: o dagre reserva espaço para ele (x/y); sem rótulo, o ponto do meio da rota.
    const mid = info.x !== undefined && info.y !== undefined ? { x: info.x, y: info.y } : pts[Math.floor(pts.length / 2)]!
    ctx.edgeVia.set(i, mid)
    if (pts.length <= 3) ctx.shortEdges.add(i)
  })
}

function columns(ctx: Ctx, nodes: LNode[]) {
  const { gap } = ctx
  const pad = Math.round(gap * 0.5)
  const frames = nodes.filter((n) => n.kind === 'frame')
  let x = 0
  let tallest = 0
  const cols = frames.map((f) => {
    const kids = nodes.filter((n) => n.frame === f.id && n.kind !== 'frame')
    const inner = Math.max(200, ...kids.map((k) => k.w))
    return { f, kids, inner }
  })
  // Linha i de todas as colunas responde ao mesmo critério: mesma altura → linhas alinhadas.
  const rowH: number[] = []
  for (const c of cols) c.kids.forEach((k, i) => (rowH[i] = Math.max(rowH[i] ?? 0, k.kind === 'note' ? 0 : k.h)))
  for (const c of cols) {
    let y = pad
    c.kids.forEach((k, i) => {
      // Cartões da mesma coluna com a mesma largura (mesmo papel → mesmo tamanho).
      const w = k.kind === 'note' ? k.w : c.inner
      const h = k.kind === 'note' ? k.h : Math.max(k.h, rowH[i] ?? 0)
      if (w !== k.w || h !== k.h) ctx.resized.add(k.id)
      ctx.boxes.set(k.id, { x: x + pad + (c.inner - w) / 2, y, w, h })
      y += Math.max(h, rowH[i] ?? 0) + Math.round(gap * 0.4)
    })
    tallest = Math.max(tallest, y - Math.round(gap * 0.4) + pad)
    ctx.boxes.set(c.f.id, { x, y: 0, w: c.inner + pad * 2, h: 0 })
    x += c.inner + pad * 2 + gap
  }
  for (const c of cols) {
    const b = ctx.boxes.get(c.f.id)!
    ctx.boxes.set(c.f.id, { ...b, h: Math.max(tallest, 120) })
    ctx.resized.add(c.f.id)
  }
}

function grid(ctx: Ctx, nodes: LNode[], cols?: number) {
  const { gap } = ctx
  const n = nodes.length
  const c = Math.max(1, Math.min(Math.round(cols ?? Math.ceil(Math.sqrt(n))), n, 8))
  const cw = Math.max(...nodes.map((x) => x.w))
  const ch = Math.max(...nodes.map((x) => x.h))
  nodes.forEach((node, i) => {
    const col = i % c
    const row = Math.floor(i / c)
    put(ctx, node.id, col * (cw + gap) + cw / 2, row * (ch + gap) + ch / 2)
  })
}

/** Frames que não são o layout em si (ex.: "um frame com o mapa mental") embrulham seus filhos. */
function wrapFrames(ctx: Ctx, nodes: LNode[]) {
  const pad = Math.round(ctx.gap * 0.6)
  for (const f of nodes.filter((n) => n.kind === 'frame')) {
    if (ctx.boxes.has(f.id)) continue
    const kids = nodes.filter((n) => n.frame === f.id && ctx.boxes.has(n.id)).map((n) => ctx.boxes.get(n.id)!)
    const u = unionRect(kids)
    if (!u) continue
    ctx.boxes.set(f.id, { x: u.x - pad, y: u.y - pad, w: u.w + pad * 2, h: u.h + pad * 2 })
    ctx.resized.add(f.id)
  }
}

export function computeLayout(input: LayoutInput): LayoutOutput {
  const ctx: Ctx = {
    byId: new Map(input.nodes.map((n) => [n.id, n])),
    gap: input.gap,
    boxes: new Map(),
    resized: new Set(),
    edgeVia: new Map(),
    shortEdges: new Set(),
  }
  const type: LayoutType = input.type
  const connected = new Set(input.edges.flatMap((e) => [e.from, e.to]))
  // Títulos soltos (sem ligações nem frame) vão acima do diagrama, não dentro dele.
  const isTitle = (n: LNode) => n.kind === 'text' && TITLE_ROLES.has(n.role ?? '') && !connected.has(n.id) && !n.frame
  const titles = input.nodes.filter(isTitle)
  const body = input.nodes.filter((n) => !isTitle(n))
  const nonFrames = body.filter((n) => n.kind !== 'frame')
  const dir = input.direction ?? (type === 'timeline' ? 'right' : 'down')

  switch (type) {
    case 'mindmap':
    case 'tree':
    case 'radial': {
      const root = pickRoot(input, nonFrames)
      if (!root) break
      const { children, depth } = spanningTree(root, nonFrames, input.edges)
      if (type === 'mindmap') mindmap(ctx, root, children, input.sides)
      else if (type === 'radial') radial(ctx, root, children, depth)
      else tidyTree(ctx, root, children, input.direction ?? 'down', Math.round(input.gap * (dir === 'down' ? 1.2 : 1)), Math.round(input.gap * 0.45))
      break
    }
    case 'cycle': {
      const hub = input.root && nonFrames.some((n) => n.id === input.root) ? input.root : undefined
      const strong = input.edges.filter((e) => !e.weak && e.from !== hub && e.to !== hub)
      const onRing = new Set(strong.flatMap((e) => [e.from, e.to]))
      const ring = sequence(nonFrames.filter((n) => onRing.has(n.id)), strong)
      cycle(ctx, ring, hub)
      satellites(ctx, ring, nonFrames, input.edges)
      break
    }
    case 'timeline': {
      const strong = input.edges.filter((e) => !e.weak)
      const onLine = new Set(strong.flatMap((e) => [e.from, e.to]))
      timeline(ctx, sequence(nonFrames.filter((n) => onLine.has(n.id) || strong.length === 0), strong), dir)
      break
    }
    case 'flow':
      flow(ctx, body, input.edges, dir)
      break
    case 'columns':
      columns(ctx, body)
      break
    case 'grid':
      grid(ctx, nonFrames.filter((n) => !n.frame), input.columns)
      break
    case 'free':
      break
  }
  wrapFrames(ctx, body)
  placeLeftovers(ctx, titles, body)
  return { boxes: ctx.boxes, resized: ctx.resized, edgeVia: ctx.edgeVia, shortEdges: ctx.shortEdges, ...(ctx.spine ? { spine: ctx.spine } : {}) }
}

/** Títulos centrados acima; nós não alcançados pelo layout numa faixa abaixo. */
function placeLeftovers(ctx: Ctx, titles: LNode[], body: LNode[]) {
  const { gap } = ctx
  const placed = unionRect([...ctx.boxes.values()]) ?? { x: 0, y: 0, w: 0, h: 0 }
  const loose = body.filter((n) => !ctx.boxes.has(n.id) && !(n.frame && ctx.boxes.has(n.frame)))
  let x = placed.x
  const y = placed.h ? placed.y + placed.h + gap * 1.2 : placed.y
  for (const n of loose) {
    ctx.boxes.set(n.id, { x, y, w: n.w, h: n.h })
    x += n.w + gap
  }
  const all = unionRect([...ctx.boxes.values()]) ?? placed
  const cx = all.x + all.w / 2
  let ty = all.y - gap
  for (const t of [...titles].reverse()) {
    ty -= t.h
    ctx.boxes.set(t.id, { x: cx - t.w / 2, y: ty, w: t.w, h: t.h })
    ty -= gap * 0.3
  }
}

/** Estilo padrão das ligações por tipo de diagrama (o plano pode sobrescrever as pontas). */
export function edgeStyle(type: LayoutType, hasLabel: boolean): { kind: 'arc' | 'elbow'; arrow: 'end' | 'none' } {
  switch (type) {
    case 'mindmap':
    case 'tree':
      return { kind: 'elbow', arrow: 'none' }
    case 'flow':
      return { kind: hasLabel ? 'arc' : 'elbow', arrow: 'end' }
    case 'radial':
      return { kind: 'arc', arrow: 'none' }
    default:
      return { kind: 'arc', arrow: 'end' }
  }
}

