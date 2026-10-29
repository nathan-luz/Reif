import { describe, expect, it } from 'vitest'
import { DESIGN_SYSTEMS, DS_COLORS, STYLE_ROLES, defaultRoleFor, describeForLLM, getDesignSystem } from './design-systems'

describe('design systems', () => {
  it.each(DESIGN_SYSTEMS.map((d) => [d.id, d]))('%s é completo e válido', (_id, ds) => {
    for (const mode of [ds.light, ds.dark]) {
      expect(mode.background).toMatch(/^#[0-9a-f]{6}$/i)
      for (const c of DS_COLORS) expect(mode.colors[c]).toMatch(/^#[0-9a-f]{6}$/i)
    }
    for (const role of STYLE_ROLES) {
      expect(DS_COLORS).toContain(ds.roles[role].color)
      expect(['draw', 'sans', 'serif', 'mono']).toContain(ds.roles[role].font)
    }
  })

  it('ids únicos e fallback para o padrão', () => {
    expect(new Set(DESIGN_SYSTEMS.map((d) => d.id)).size).toBe(DESIGN_SYSTEMS.length)
    expect(getDesignSystem('inexistente').id).toBe('classic')
    expect(getDesignSystem('blueprint').id).toBe('blueprint')
  })

  it('papel padrão por tipo', () => {
    expect(defaultRoleFor('text', 'xl')).toBe('title')
    expect(defaultRoleFor('text')).toBe('body')
    expect(defaultRoleFor('frame')).toBe('container')
    expect(defaultRoleFor('line')).toBe('connector')
    expect(defaultRoleFor('geo')).toBe('primary')
  })

  it('descrição para o LLM cita os papéis', () => {
    const text = describeForLLM(getDesignSystem('minimal'))
    for (const role of STYLE_ROLES) expect(text).toContain(role)
  })
})
