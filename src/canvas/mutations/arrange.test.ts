import { describe, expect, it } from 'vitest'
import { getDesignSystem } from '../../shared/design-systems'
import type { MutationPlan, ResolvedCreateNode } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import type { ExistingDiagram, ExistingNode } from '../subgraph/structure'
import { arrangePlan } from './arrange'
import { overlaps } from './placement'

const node = (id: string, x: number, y: number, w: number, h: number, extra: Partial<ExistingNode> = {}): ExistingNode => ({
  id, kind: 'geo', x, y, w, h, text: id, ...extra,
})

/** Mapa existente: raiz no centro; "Natureza" à esquerda com 3 folhas; "Linguagens" à direita com 2. */
function existing(): ExistingDiagram {
  const nodes = new Map<string, ExistingNode>([
    ['root', node('root', 0, 0, 300, 80, { role: 'accent' })],
    ['nat', node('nat', -400, -150, 220, 80, { color: 'violet' })],
    ['bio', node('bio', -600, -200, 110, 32, { kind: 'text', color: 'violet' })],
    ['qui', node('qui', -600, -140, 110, 32, { kind: 'text', color: 'violet' })],
    ['fis', node('fis', -600, -80, 90, 32, { kind: 'text', color: 'violet' })],
    ['lin', node('lin', 420, 0, 180, 60, { color: 'blue' })],
    ['l1', node('l1', 700, -30, 140, 32, { kind: 'text', color: 'blue' })],
    ['l2', node('l2', 700, 30, 140, 32, { kind: 'text', color: 'blue' })],
  ])
  const edges = [
    { from: 'root', to: 'nat' },
    { from: 'nat', to: 'bio' },
    { from: 'nat', to: 'qui' },
    { from: 'nat', to: 'fis' },
    { from: 'root', to: 'lin' },
    { from: 'lin', to: 'l1' },
    { from: 'lin', to: 'l2' },
  ]
  const parent = new Map(edges.map((e) => [e.to, e.from]))
  const depth = new Map([['root', 0], ['nat', 1], ['lin', 1], ['bio', 2], ['qui', 2], ['fis', 2], ['l1', 2], ['l2', 2]])
  return { rootId: 'root', type: 'mindmap', direction: 'down', nodes, edges, parent, depth }
}

const T = (ref: string, text: string, role: 'body' | 'muted'): ResolvedCreateNode => ({ ref, kind: 'text', text, x: 0, y: 0, points: [], role })

describe('arrangePlan: regeração dentro de um diagrama existente', () => {
  const create = [T('c1', 'Ecologia', 'body'), T('c2', 'Genética', 'body'), T('c3', 'Citologia', 'body'), T('g1', 'Leis de Mendel', 'muted')]
  const plan: MutationPlan = {
    design: '', summary: '', delete: [], update: [], create,
    connect: [{ from: 'bio', to: 'c1' }, { from: 'bio', to: 'c2' }, { from: 'bio', to: 'c3' }, { from: 'c2', to: 'g1' }],
    layout: { type: 'mindmap', root: 'bio' },
  }
  const sub: SubgraphPayload = { mode: 'selection', bounds: { x: -600, y: -200, w: 110, h: 32 }, nodes: [], edges: [] }
  const ex = existing()
  const out = arrangePlan(null, plan, sub, getDesignSystem('classic'), ex)

  it('cresce para fora (mesmo lado do ramo), sem sobrepor nada e com a raiz fixa', () => {
    const final = new Map<string, { x: number; y: number; w: number; h: number }>()
    for (const n of ex.nodes.values()) final.set(n.id, { ...n, ...(out.moves?.get(n.id) ?? {}) })
    for (const c of out.create) final.set(c.ref, { x: c.x, y: c.y, w: c.w!, h: c.h! })
    expect(out.moves?.has('root')).toBe(false)
    const bio = final.get('bio')!
    for (const id of ['c1', 'c2', 'c3', 'g1']) expect(final.get(id)!.x + final.get(id)!.w).toBeLessThan(bio.x)
    expect(final.get('lin')!.x).toBeGreaterThan(0) // ramo da direita continua à direita
    const list = [...final.entries()]
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i]![1], list[j]![1]), `${list[i]![0]} × ${list[j]![0]}`).toBe(false)
  })

  it('nós novos herdam a cor do ramo e textos à esquerda alinham à direita', () => {
    for (const id of ['c1', 'c2', 'c3', 'g1']) expect(out.branch.get(id)).toBe('violet')
    expect(out.align.get('c1')).toBe('end')
    expect(out.layout).toEqual({ type: 'mindmap', direction: 'down' })
  })
})
