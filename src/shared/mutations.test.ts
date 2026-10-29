import { describe, expect, it } from 'vitest'
import { LLMPlanSchema, sanitizePlan, stripEmptyOptionals, type CreateNode, type LLMPlan } from './mutations'
import type { SubgraphPayload } from './subgraph'

const subgraph: SubgraphPayload = {
  mode: 'selection',
  bounds: { x: 0, y: 0, w: 400, h: 200 },
  nodes: [
    { id: 'shape:a', type: 'note', bounds: { x: 0, y: 0, w: 200, h: 200 }, rotation: 0, text: 'A', props: {} },
    { id: 'shape:b', type: 'note', bounds: { x: 220, y: 0, w: 200, h: 200 }, rotation: 0, text: 'B', props: {} },
  ],
  edges: [{ id: 'shape:edge', from: 'shape:a', to: 'shape:b' }],
}

const node = (over: Partial<CreateNode>): CreateNode => ({ ref: 'n1', kind: 'note', text: 'x', x: 0, y: 0, points: [], ...over })
const plan = (over: Partial<LLMPlan>): LLMPlan => ({ summary: 's', delete: [], update: [], create: [], connect: [], ...over })

describe('sanitizePlan', () => {
  it('descarta ids fora da seleção em delete/update', () => {
    const out = sanitizePlan(
      plan({ delete: ['shape:a', 'shape:hacker'], update: [{ id: 'shape:zzz', text: 'x' }, { id: 'shape:b', text: 'ok' }] }),
      subgraph,
    )
    expect(out.delete).toEqual(['shape:a'])
    expect(out.update).toEqual([{ id: 'shape:b', text: 'ok' }])
  })

  it('não atualiza o que também é deletado', () => {
    const out = sanitizePlan(plan({ delete: ['shape:a'], update: [{ id: 'shape:a', text: 'x' }] }), subgraph)
    expect(out.update).toEqual([])
  })

  it('remove refs duplicadas e refs que colidem com ids existentes', () => {
    const out = sanitizePlan(plan({ create: [node({ ref: 'n1' }), node({ ref: 'n1' }), node({ ref: 'shape:a' })] }), subgraph)
    expect(out.create.map((c) => c.ref)).toEqual(['n1'])
  })

  it('exige pontos em line/draw e limita a 60', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ x: i, y: i }))
    const out = sanitizePlan(
      plan({ create: [node({ ref: 'l1', kind: 'line', points: [{ x: 0, y: 0 }] }), node({ ref: 'd1', kind: 'draw', points: many })] }),
      subgraph,
    )
    expect(out.create.map((c) => c.ref)).toEqual(['d1'])
    expect(out.create[0]?.points).toHaveLength(60)
  })

  it('remove frame inexistente, mantém frame válido', () => {
    const out = sanitizePlan(
      plan({ create: [node({ ref: 'f', kind: 'frame' }), node({ ref: 'a', frame: 'f' }), node({ ref: 'b', frame: 'nope' })] }),
      subgraph,
    )
    expect(out.create.find((c) => c.ref === 'a')?.frame).toBe('f')
    expect(out.create.find((c) => c.ref === 'b')).not.toHaveProperty('frame')
  })

  it('conexões só entre nós vivos e sem laço', () => {
    const out = sanitizePlan(
      plan({
        delete: ['shape:b'],
        create: [node({ ref: 'n1' })],
        connect: [
          { from: 'shape:a', to: 'n1' },
          { from: 'shape:a', to: 'shape:b' },
          { from: 'n1', to: 'n1' },
          { from: 'n1', to: 'ghost' },
        ],
      }),
      subgraph,
    )
    expect(out.connect).toEqual([{ from: 'shape:a', to: 'n1' }])
  })
})

describe('stripEmptyOptionals', () => {
  it('remove "" de campos opcionais (Gemini), preserva text/summary e aninhados', () => {
    const raw = { summary: '', create: [{ ref: 'n1', kind: 'note', text: '', frame: '', query: '', x: 1, y: 2, points: [] }] }
    const out = stripEmptyOptionals(raw) as { summary: string; create: Record<string, unknown>[] }
    expect(out.summary).toBe('')
    expect(out.create[0]).toEqual({ ref: 'n1', kind: 'note', text: '', x: 1, y: 2, points: [] })
  })

  it('o resultado passa no schema do LLM', () => {
    const raw = { summary: 'ok', delete: [], update: [], connect: [], create: [{ ref: 'n1', kind: 'geo', text: 'A', x: 0, y: 0, points: [], role: '', color: '' }] }
    expect(LLMPlanSchema.safeParse(stripEmptyOptionals(raw)).success).toBe(true)
  })
})
