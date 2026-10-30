import { describe, expect, it } from 'vitest'
import { computeLayout, sequence, type LEdge, type LNode } from './layout'
import { overlaps } from './placement'
import type { LayoutType } from '../../shared/mutations'

const box = (id: string, w = 160, h = 60, extra: Partial<LNode> = {}): LNode => ({ id, kind: 'geo', w, h, ...extra })

/** Raiz + 5 ramos + 2-3 sub-ramos cada (formato típico de mapa mental de estudo). */
function studyTree() {
  const nodes: LNode[] = [box('root', 220, 80, { role: 'accent' })]
  const edges: LEdge[] = []
  for (let i = 1; i <= 5; i++) {
    nodes.push(box(`b${i}`, 150 + i * 10, 56))
    edges.push({ from: 'root', to: `b${i}` })
    for (let j = 1; j <= (i % 2 ? 3 : 2); j++) {
      nodes.push({ id: `b${i}-${j}`, kind: 'text', w: 120 + j * 20, h: 34 })
      edges.push({ from: `b${i}`, to: `b${i}-${j}` })
    }
  }
  return { nodes, edges }
}

function expectNoOverlaps(boxes: Map<string, { x: number; y: number; w: number; h: number }>, ignore: Set<string> = new Set()) {
  const list = [...boxes.entries()].filter(([id]) => !ignore.has(id))
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const [a, ra] = list[i]!
      const [b, rb] = list[j]!
      expect(overlaps(ra, rb), `${a} × ${b}`).toBe(false)
    }
}

describe('computeLayout', () => {
  const types: LayoutType[] = ['mindmap', 'tree', 'flow', 'radial', 'grid']
  for (const type of types) {
    it(`${type}: posiciona todos os nós sem sobreposição`, () => {
      const { nodes, edges } = studyTree()
      const out = computeLayout({ type, root: 'root', nodes, edges, gap: 56 })
      expect(out.boxes.size).toBe(nodes.length)
      expectNoOverlaps(out.boxes)
    })
  }

  it('mindmap: ramos dos dois lados da raiz, filhos do mesmo lado do pai', () => {
    const { nodes, edges } = studyTree()
    const b = computeLayout({ type: 'mindmap', root: 'root', nodes, edges, gap: 56 }).boxes
    const cx = (id: string) => b.get(id)!.x + b.get(id)!.w / 2
    const root = cx('root')
    const sides = [1, 2, 3, 4, 5].map((i) => Math.sign(cx(`b${i}`) - root))
    expect(sides).toContain(1)
    expect(sides).toContain(-1)
    for (let i = 1; i <= 5; i++) expect(Math.sign(cx(`b${i}-1`) - root)).toBe(Math.sign(cx(`b${i}`) - root))
  })

  it('tree down: cada nível abaixo do anterior', () => {
    const { nodes, edges } = studyTree()
    const b = computeLayout({ type: 'tree', root: 'root', nodes, edges, gap: 56 }).boxes
    expect(b.get('b1')!.y).toBeGreaterThan(b.get('root')!.y + b.get('root')!.h)
    expect(b.get('b1-1')!.y).toBeGreaterThan(b.get('b1')!.y + b.get('b1')!.h)
  })

  it('flow: respeita a direção das setas (camadas)', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => box(id))
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c', label: 'sim' },
      { from: 'b', to: 'd', label: 'não' },
    ]
    const down = computeLayout({ type: 'flow', nodes, edges, gap: 56 }).boxes
    expect(down.get('b')!.y).toBeGreaterThan(down.get('a')!.y)
    expect(down.get('c')!.y).toBeGreaterThan(down.get('b')!.y)
    const right = computeLayout({ type: 'flow', direction: 'right', nodes, edges, gap: 56 }).boxes
    expect(right.get('c')!.x).toBeGreaterThan(right.get('b')!.x)
    expectNoOverlaps(down)
  })

  it('cycle: segue a ordem das setas, com hub no centro', () => {
    const nodes = [box('hub', 200, 80), ...['p1', 'p2', 'p3', 'p4'].map((id) => box(id))]
    const edges = [
      { from: 'p1', to: 'p2' },
      { from: 'p2', to: 'p3' },
      { from: 'p3', to: 'p4' },
      { from: 'p4', to: 'p1' },
    ]
    const b = computeLayout({ type: 'cycle', root: 'hub', nodes, edges, gap: 56 }).boxes
    expectNoOverlaps(b)
    const c = (id: string) => ({ x: b.get(id)!.x + b.get(id)!.w / 2, y: b.get(id)!.y + b.get(id)!.h / 2 })
    expect(Math.round(c('hub').x)).toBe(0)
    expect(c('p1').y).toBeLessThan(c('hub').y) // começa no topo
    expect(c('p2').x).toBeGreaterThan(c('hub').x) // sentido horário
  })

  it('cycle: anotações (ligação fraca) ficam fora do anel, junto do seu estágio', () => {
    const nodes = [box('hub', 200, 80), ...['p1', 'p2', 'p3'].map((id) => box(id)), { id: 'out', kind: 'text', w: 120, h: 30 }]
    const edges = [
      { from: 'p1', to: 'p2' },
      { from: 'p2', to: 'p3' },
      { from: 'p3', to: 'p1' },
      { from: 'p2', to: 'out', weak: true },
    ]
    const b = computeLayout({ type: 'cycle', root: 'hub', nodes, edges, gap: 56 }).boxes
    expectNoOverlaps(b)
    const c = (id: string) => ({ x: b.get(id)!.x + b.get(id)!.w / 2, y: b.get(id)!.y + b.get(id)!.h / 2 })
    expect(Math.hypot(c('out').x, c('out').y)).toBeGreaterThan(Math.hypot(c('p2').x, c('p2').y))
  })

  it('timeline: muitos eventos alternam acima/abaixo sem colidir', () => {
    const nodes = Array.from({ length: 8 }, (_, i) => box(`t${i}`, 180, 70))
    const edges = nodes.slice(1).map((n, i) => ({ from: `t${i}`, to: n.id }))
    const b = computeLayout({ type: 'timeline', nodes, edges, gap: 56 }).boxes
    expectNoOverlaps(b)
    for (let i = 1; i < 8; i++) expect(b.get(`t${i}`)!.x).toBeGreaterThan(b.get(`t${i - 1}`)!.x)
  })

  it('columns: frames lado a lado, filhos dentro e com a mesma largura', () => {
    const nodes: LNode[] = [
      { id: 'f1', kind: 'frame', w: 10, h: 10 },
      { id: 'f2', kind: 'frame', w: 10, h: 10 },
      box('a1', 180, 60, { frame: 'f1' }),
      box('a2', 240, 60, { frame: 'f1' }),
      box('b1', 200, 90, { frame: 'f2' }),
    ]
    const out = computeLayout({ type: 'columns', nodes, edges: [], gap: 56 })
    const f1 = out.boxes.get('f1')!
    const f2 = out.boxes.get('f2')!
    expect(f2.x).toBeGreaterThan(f1.x + f1.w)
    expect(f1.h).toBe(f2.h)
    for (const id of ['a1', 'a2']) {
      const r = out.boxes.get(id)!
      expect(r.x).toBeGreaterThanOrEqual(f1.x)
      expect(r.x + r.w).toBeLessThanOrEqual(f1.x + f1.w)
    }
    expect(out.boxes.get('a1')!.w).toBe(out.boxes.get('a2')!.w)
  })

  it('títulos soltos vão acima do diagrama; nós não alcançados, abaixo', () => {
    const { nodes, edges } = studyTree()
    nodes.push({ id: 'title', kind: 'text', role: 'title', w: 300, h: 50 }, box('orphan'))
    const b = computeLayout({ type: 'mindmap', root: 'root', nodes, edges, gap: 56 }).boxes
    const others = [...b.entries()].filter(([id]) => id !== 'title' && id !== 'orphan').map(([, r]) => r)
    expect(b.get('title')!.y + b.get('title')!.h).toBeLessThanOrEqual(Math.min(...others.map((r) => r.y)))
    expect(b.get('orphan')!.y).toBeGreaterThanOrEqual(Math.max(...others.map((r) => r.y + r.h)))
  })

  it('frame que embrulha o diagrama recebe os limites dos filhos', () => {
    const { nodes, edges } = studyTree()
    for (const n of nodes) n.frame = 'wrap'
    nodes.push({ id: 'wrap', kind: 'frame', w: 10, h: 10 })
    const out = computeLayout({ type: 'mindmap', root: 'root', nodes, edges, gap: 56 })
    const f = out.boxes.get('wrap')!
    for (const n of nodes.filter((x) => x.id !== 'wrap')) {
      const r = out.boxes.get(n.id)!
      expect(r.x).toBeGreaterThan(f.x)
      expect(r.y + r.h).toBeLessThan(f.y + f.h)
    }
  })
})

describe('sequence', () => {
  it('segue a cadeia de setas e anexa o restante na ordem original', () => {
    const nodes = ['c', 'a', 'b', 'x'].map((id) => box(id))
    expect(sequence(nodes, [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }])).toEqual(['a', 'b', 'c', 'x'])
  })
})

describe('mindmap com lados fixos (regeração)', () => {
  it('mantém cada ramo existente do lado em que estava, mesmo desbalanceado', () => {
    const { nodes, edges } = studyTree()
    const sides = new Map<string, 1 | -1>([['b1', -1], ['b2', -1], ['b3', -1], ['b4', 1], ['b5', -1]])
    const b = computeLayout({ type: 'mindmap', root: 'root', nodes, edges, gap: 56, sides }).boxes
    const cx = (id: string) => b.get(id)!.x + b.get(id)!.w / 2
    for (const [id, side] of sides) expect(Math.sign(cx(id) - cx('root'))).toBe(side)
    expectNoOverlaps(b)
  })
})
