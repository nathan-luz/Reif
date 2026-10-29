// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { Editor } from 'tldraw'
import { getDesignSystem } from '../../shared/design-systems'
import type { MutationPlan } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import { applyPlan } from './apply'

/** Editor falso: registra as chamadas e garante que tudo acontece dentro de editor.run(). */
function fakeEditor(existing: Record<string, { type: string; props: Record<string, unknown> }> = {}) {
  let inRun = false
  const calls: string[] = []
  const guard = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push(name)
      if (!inRun) throw new Error(`${name} fora de editor.run()`)
      return args
    })
  const editor = {
    calls,
    markHistoryStoppingPoint: vi.fn(() => calls.push('mark')),
    run: vi.fn((fn: () => void) => {
      inRun = true
      try {
        fn()
      } finally {
        inRun = false
      }
    }),
    deleteShapes: guard('deleteShapes'),
    updateShapes: guard('updateShapes'),
    createShape: guard('createShape'),
    createBindings: guard('createBindings'),
    select: guard('select'),
    getCurrentPageId: () => 'page:page',
    getCurrentPageShapes: () => [],
    getShapePageBounds: () => undefined,
    getShape: (id: string) => (existing[id] ? { id, ...existing[id] } : undefined),
  }
  return editor
}

const subgraph: SubgraphPayload = {
  mode: 'selection',
  bounds: { x: 0, y: 0, w: 420, h: 200 },
  nodes: [
    { id: 'shape:a', type: 'note', bounds: { x: 0, y: 0, w: 200, h: 200 }, rotation: 0, text: 'A', props: {} },
    { id: 'shape:b', type: 'note', bounds: { x: 220, y: 0, w: 200, h: 200 }, rotation: 0, text: 'B', props: {} },
  ],
  edges: [{ id: 'shape:edge', from: 'shape:a', to: 'shape:b' }],
}

describe('applyPlan', () => {
  it('lê o plano estruturado e chama os métodos atômicos dentro de um único editor.run()', () => {
    const editor = fakeEditor({ 'shape:b': { type: 'note', props: { richText: {}, color: 'black' } } })
    const plan: MutationPlan = {
      summary: 'Resumo',
      delete: ['shape:a'],
      update: [{ id: 'shape:b', text: 'B editado' }],
      create: [
        { ref: 'f', kind: 'frame', text: 'Grupo', x: 500, y: 0, w: 400, h: 300, points: [] },
        { ref: 'n1', kind: 'note', text: 'Resumo', x: 520, y: 40, points: [], role: 'primary', frame: 'f' },
        { ref: 'l1', kind: 'line', text: '', x: 0, y: 400, points: [{ x: 0, y: 400 }, { x: 200, y: 400 }] },
      ],
      connect: [{ from: 'shape:b', to: 'n1', label: 'vira' }],
    }
    const { created } = applyPlan(editor as unknown as Editor, plan, subgraph, getDesignSystem('classic'))

    expect(editor.run).toHaveBeenCalledTimes(1)
    expect(editor.calls[0]).toBe('mark')
    // seta do sub-grafo ligada a um nó apagado também sai
    expect(editor.deleteShapes.mock.calls[0]?.[0]).toEqual(['shape:a', 'shape:edge'])
    expect(editor.updateShapes).toHaveBeenCalledTimes(1)

    type Created = { id: string; type: string; parentId: string; meta: { reif?: { role: string } }; x: number; y: number; props: Record<string, unknown> }
    const shapes = editor.createShape.mock.calls.map((c) => c[0] as Created)
    expect(shapes.map((s) => s.type)).toEqual(['frame', 'note', 'line', 'arrow'])
    const [frame, note, line] = shapes
    // filho do frame em coordenadas locais
    expect(note?.parentId).toBe(frame?.id)
    expect([note?.x, note?.y]).toEqual([20, 40])
    // estilo veio do papel (design system) e o shape ficou marcado como gerado
    expect(note?.props.color).toBe('ds-primary')
    expect(note?.meta.reif?.role).toBe('primary')
    expect(line?.parentId).toBe('page:page')
    // exatamente os 2 pontos enviados (regressão: getIndices(n) gerava n+1)
    expect(Object.keys((line?.props.points ?? {}) as object)).toHaveLength(2)
    // seta com bindings nas duas pontas
    expect(editor.createBindings).toHaveBeenCalledTimes(1)
    // frame, line e seta no topo; a nota está dentro do frame
    expect(created).toHaveLength(3)
  })
})
