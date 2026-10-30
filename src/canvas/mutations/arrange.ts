import type { Editor } from 'tldraw'
import type { DesignSystem } from '../../shared/design-systems'
import type { MutationPlan, ResolvedCreateNode } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import { footprint, roleOf, styleOf } from './build'
import { computeLayout, pickRoot, spanningTree, type LNode, type Pt, type Spine } from './layout'
import { measureNode } from './measure'
import { overlaps, unionRect, type Rect } from './placement'

const POSITIONED = new Set(['geo', 'note', 'text', 'image', 'youtube', 'frame'])
/** Distância entre a seleção e o diagrama novo (mesma regra dada ao LLM). */
const SIDE_GAP = 80

export interface Arranged {
  create: ResolvedCreateNode[]
  /** Diagrama ancorado num nó existente (raiz): não deslocar o bloco depois. */
  pinned: boolean
  /** Alinhamento de textos soltos (ex.: folhas à esquerda num mapa mental encostam no ramo). */
  align: Map<string, TextAlign>
  /** flow: ponto de passagem (página) de cada ligação, por índice em plan.connect. */
  edgeVia: Map<number, Pt>
  shortEdges: Set<number>
  /** timeline: eixo em coordenadas de página (antes do deslocamento de grupo). */
  spine?: Spine
  /** branchColors: cor de cada nó (pelo ramo de 1º nível a que pertence). */
  branch: Map<string, BranchColor>
}

/** Matizes distintos do tldraw para ramos (sinalização: 1 cor = 1 ramo; raiz neutra). */
export const BRANCH_COLORS = ['blue', 'green', 'violet', 'red', 'light-blue', 'yellow', 'orange'] as const
export type BranchColor = (typeof BRANCH_COLORS)[number]

function branchColors(rootId: string, nodes: LNode[], edges: { from: string; to: string }[]): Map<string, BranchColor> {
  const { children } = spanningTree(rootId, nodes, edges)
  const out = new Map<string, BranchColor>()
  ;(children.get(rootId) ?? []).forEach((b, i) => {
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length]!
    const stack = [b]
    while (stack.length) {
      const id = stack.pop()!
      out.set(id, color)
      stack.push(...(children.get(id) ?? []))
    }
  })
  return out
}

export type TextAlign = 'start' | 'middle' | 'end'

/**
 * Converte a estrutura do plano em posições: mede cada nó, roda o layout do tipo pedido
 * e ancora o resultado (ao lado da seleção, no lugar dos nós substituídos, no centro da
 * área visível ou em volta de uma raiz existente). Em "free", só corrige sobreposições.
 */
export function arrangePlan(editor: Editor | null, plan: MutationPlan, subgraph: SubgraphPayload, ds: DesignSystem): Arranged {
  const sized = plan.create.map((c) => {
    if (!POSITIONED.has(c.kind) || c.kind === 'frame') return c
    // Livre: textos mantêm autoSize (o LLM os posicionou contando com uma linha só).
    if (plan.layout.type === 'free' && c.kind === 'text') return c
    const props = styleOf(c, c.kind === 'image' || c.kind === 'youtube' ? 'geo' : c.kind, ds).props
    const m = measureNode(editor, c, { size: props.size, font: props.font }, roleOf(c))
    if (!m) return c
    // Layout manda no tamanho; em "free" só cresce (o LLM pode ter pedido maior de propósito).
    return plan.layout.type === 'free' ? { ...c, w: Math.max(c.w ?? 0, m.w), h: Math.max(c.h ?? 0, m.h) } : { ...c, ...m }
  })
  if (plan.layout.type === 'free') return { create: liftTitles(editor, separate(sized), ds), pinned: false, align: new Map(), edgeVia: new Map(), shortEdges: new Set(), branch: new Map() }

  const rootExisting = plan.layout.root ? subgraph.nodes.find((n) => n.id === plan.layout.root) : undefined
  const nodes: LNode[] = sized
    .filter((c) => POSITIONED.has(c.kind))
    .map((c) => {
      const f = footprint(c)
      return { id: c.ref, kind: c.kind, w: f.w, h: f.h, role: roleOf(c), frame: c.frame }
    })
  if (rootExisting) nodes.unshift({ id: rootExisting.id, kind: rootExisting.type, w: rootExisting.bounds.w, h: rootExisting.bounds.h })

  const { boxes, edgeVia, shortEdges, spine } = computeLayout({ ...plan.layout, nodes, edges: plan.connect.map((c) => ({ ...c, weak: c.arrow === 'none' || c.dashed === true })), gap: ds.layout.gap })
  const own = [...boxes.entries()].filter(([id]) => id !== rootExisting?.id).map(([, r]) => r)
  const union = unionRect(own)
  if (!union) return { create: sized, pinned: false, align: new Map(), edgeVia: new Map(), shortEdges: new Set(), branch: new Map() }

  // Âncora do bloco calculado.
  let dx: number
  let dy: number
  const b = subgraph.bounds
  const rootBox = rootExisting ? boxes.get(rootExisting.id) : undefined
  if (rootExisting && rootBox) {
    dx = rootExisting.bounds.x - rootBox.x
    dy = rootExisting.bounds.y - rootBox.y
  } else if (subgraph.mode === 'viewport') {
    dx = b.x + b.w / 2 - (union.x + union.w / 2)
    dy = b.y + b.h / 2 - (union.y + union.h / 2)
  } else if (plan.delete.length) {
    dx = b.x - union.x
    dy = b.y - union.y
  } else {
    dx = b.x + b.w + SIDE_GAP - union.x
    dy = b.y - union.y
  }

  // line/draw continuam com as coordenadas do LLM, transladadas junto com o bloco.
  const llmUnion = unionRect(plan.create.filter((c) => POSITIONED.has(c.kind)).map(footprint)) ?? union
  const shiftX = union.x + dx - llmUnion.x
  const shiftY = union.y + dy - llmUnion.y

  const create = sized.map((c): ResolvedCreateNode => {
    const r = boxes.get(c.ref)
    if (r) return { ...c, x: Math.round(r.x + dx), y: Math.round(r.y + dy), w: Math.round(r.w), h: Math.round(r.h) }
    if (c.kind === 'line' || c.kind === 'draw') {
      const points = c.points.map((p) => ({ x: p.x + shiftX, y: p.y + shiftY }))
      return { ...c, x: c.x + shiftX, y: c.y + shiftY, points }
    }
    return c
  })
  // Folhas de texto: à esquerda da raiz encostam à direita; em layouts centrados, centralizam.
  const align = new Map<string, TextAlign>()
  const rootCx = rootBox ? rootBox.x + rootBox.w / 2 : (() => {
    const r = plan.layout.root ? boxes.get(plan.layout.root) : undefined
    return r ? r.x + r.w / 2 : undefined
  })()
  const centered = ['radial', 'cycle', 'grid', 'flow', 'timeline'].includes(plan.layout.type) || (plan.layout.type === 'tree' && plan.layout.direction !== 'right')
  for (const c of create) {
    if (c.kind !== 'text') continue
    const r = boxes.get(c.ref)
    const role = roleOf(c)
    if (role === 'title' || role === 'heading') align.set(c.ref, 'middle')
    else if (plan.layout.type === 'mindmap' && r && rootCx !== undefined && r.x + r.w / 2 < rootCx) align.set(c.ref, 'end')
    else if (centered) align.set(c.ref, 'middle')
  }
  const root = pickRoot({ ...plan.layout, nodes, edges: plan.connect }, nodes.filter((n) => n.kind !== 'frame'))
  const branch =
    plan.layout.branchColors && root && ['mindmap', 'radial', 'tree'].includes(plan.layout.type)
      ? branchColors(root, nodes.filter((n) => n.kind !== 'frame'), plan.connect)
      : new Map<string, BranchColor>()
  const move = (p: Pt): Pt => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) })
  return {
    create,
    pinned: Boolean(rootExisting && rootBox),
    align,
    edgeVia: new Map([...edgeVia].map(([i, p]) => [i, move(p)])),
    shortEdges,
    branch,
    ...(spine
      ? { spine: { from: move(spine.from), to: move(spine.to), marks: spine.marks.map((m) => ({ id: m.id, at: move(m.at), card: move(m.card) })) } }
      : {}),
  }
}

/**
 * Layout livre: o LLM escolheu as coordenadas. Afasta blocos de topo que se sobrepõem
 * (cartões, formas, mídia, frames), empurrando o de baixo/direita pelo menor eixo.
 */
export function separate(create: ResolvedCreateNode[], gap = 24, maxPasses = 40): ResolvedCreateNode[] {
  const movable = (c: ResolvedCreateNode) => !c.frame && ['geo', 'note', 'image', 'youtube', 'frame'].includes(c.kind)
  const out = create.map((c) => ({ ...c }))
  const idx = out.map((c, i) => (movable(c) ? i : -1)).filter((i) => i >= 0)
  const shift = new Map<string, { x: number; y: number }>()
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false
    for (let a = 0; a < idx.length; a++)
      for (let b = a + 1; b < idx.length; b++) {
        const A = out[idx[a]!]!
        const B = out[idx[b]!]!
        const ra: Rect = footprint(A)
        const rb: Rect = footprint(B)
        if (!overlaps(ra, rb)) continue
        // Frame contendo o outro inteiro é intencional (agrupamento visual).
        if (A.kind === 'frame' || B.kind === 'frame') continue
        const pushX = ra.x + ra.w + gap - rb.x
        const pushY = ra.y + ra.h + gap - rb.y
        const d = pushX <= pushY ? { x: pushX, y: 0 } : { x: 0, y: pushY }
        B.x += d.x
        B.y += d.y
        const s = shift.get(B.ref) ?? { x: 0, y: 0 }
        shift.set(B.ref, { x: s.x + d.x, y: s.y + d.y })
        moved = true
      }
    if (!moved) break
  }
  // Filhos de frames movidos acompanham o frame.
  return out.map((c) => {
    const s = c.frame ? shift.get(c.frame) : undefined
    return s ? { ...c, x: c.x + s.x, y: c.y + s.y } : c
  })
}

/**
 * Layout livre: títulos (texto title/heading) que colidem com o conteúdo sobem até ficar
 * livres — o LLM costuma subestimar a largura/altura de um título grande.
 */
export function liftTitles(editor: Editor | null, create: ResolvedCreateNode[], ds: DesignSystem, gap = 24): ResolvedCreateNode[] {
  const boxOf = (c: ResolvedCreateNode): Rect => {
    if (c.kind !== 'text') return footprint(c)
    const props = styleOf(c, 'text', ds).props
    const m = measureNode(editor, { ...c, w: undefined }, { size: props.size, font: props.font }, 'free-text')
    return { x: c.x, y: c.y, w: c.w || m?.w || 240, h: m?.h ?? 40 }
  }
  const out = create.map((c) => ({ ...c }))
  for (const t of out) {
    const role = roleOf(t)
    if (t.kind !== 'text' || (role !== 'title' && role !== 'heading')) continue
    for (let i = 0; i < 10; i++) {
      const tb = boxOf(t)
      const hits = out.filter((o) => o !== t && !o.frame).map(boxOf).filter((b) => b.w + b.h > 0 && overlaps(tb, b))
      if (!hits.length) break
      t.y = Math.min(...hits.map((b) => b.y)) - tb.h - gap
    }
  }
  return out
}
