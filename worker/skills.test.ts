import { describe, expect, it } from 'vitest'
import { parseSkill, selectSkills, SKILLS } from './skills'
import type { SubgraphPayload } from '../src/shared/subgraph'

const empty: SubgraphPayload = { mode: 'viewport', bounds: { x: 0, y: 0, w: 1000, h: 800 }, nodes: [], edges: [] }
const names = (prompt: string, subgraph = empty) => selectSkills({ prompt, subgraph }).map((s) => s.name)

describe('skills', () => {
  it('todas as skills têm frontmatter válido', () => {
    for (const s of Object.values(SKILLS)) {
      expect(s.name).toMatch(/^[a-z-]+$/)
      expect(s.description.length).toBeGreaterThan(40)
      expect(s.body).not.toContain('---\nname:')
    }
  })

  it('parseSkill separa frontmatter e corpo', () => {
    expect(parseSkill('---\nname: x\ndescription: y\n---\n# Corpo')).toEqual({ name: 'x', description: 'y', body: '# Corpo' })
  })

  it('roteia pela intenção (pt/en, sem acentos)', () => {
    expect(names('Crie um mapa mental sobre fotossíntese')).toEqual(['diagram-core', 'mind-map'])
    expect(names('Make a concept map about the immune system')).toContain('concept-map')
    expect(names('fluxograma do atendimento')).toContain('process-flow')
    expect(names('linha do tempo da Revolução Francesa')).toContain('process-flow')
    expect(names('compare mitose e meiose')).toContain('compare-classify')
    expect(names('gráfico de barras das vendas')).toContain('charts')
  })

  it('sem gatilho: core + todas as de estudo (sem charts)', () => {
    expect(names('desenhe algo sobre biologia celular')).toEqual(['diagram-core', 'mind-map', 'concept-map', 'process-flow', 'compare-classify'])
  })

  it('palavras que contêm gatilhos curtos não disparam', () => {
    expect(names('cuidados com frases e piece')).not.toContain('charts')
  })

  it('com seleção, inclui notes-to-diagram', () => {
    const sel: SubgraphPayload = { ...empty, mode: 'selection', nodes: [{ id: 'shape:a', type: 'note', bounds: { x: 0, y: 0, w: 200, h: 200 }, rotation: 0, text: 'x', props: {} }] }
    expect(names('organize em um mapa mental', sel)).toContain('notes-to-diagram')
  })
})
