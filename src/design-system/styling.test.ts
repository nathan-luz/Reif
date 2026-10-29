import { describe, expect, it } from 'vitest'
import { getDesignSystem } from '../shared/design-systems'
import { allowedStyleProps, readReifMeta, reifMeta, roleProps } from './styling'

const blueprint = getDesignSystem('blueprint')

describe('roleProps', () => {
  it('filtra pelas props que o tipo suporta', () => {
    expect(roleProps(blueprint, 'primary', 'frame')).toEqual({ color: 'ds-primary' })
    expect(Object.keys(roleProps(blueprint, 'primary', 'geo')).sort()).toEqual([...allowedStyleProps('geo')].sort())
  })

  it('rótulos usam sempre a tinta do design system', () => {
    expect(roleProps(blueprint, 'accent', 'geo').labelColor).toBe('ds-ink')
  })

  it('pula props sobrescritas pelo usuário', () => {
    const props = roleProps(blueprint, 'primary', 'geo', ['color', 'fill'])
    expect(props).not.toHaveProperty('color')
    expect(props).not.toHaveProperty('fill')
    expect(props.font).toBe('mono')
  })

  it('tipo desconhecido não recebe estilo', () => {
    expect(roleProps(blueprint, 'primary', 'youtube')).toEqual({})
  })
})

describe('meta', () => {
  const shape = (meta: unknown) => ({ meta }) as Parameters<typeof readReifMeta>[0]
  it('round-trip', () => {
    expect(readReifMeta(shape(reifMeta('accent', ['color'])))).toEqual({ generated: true, role: 'accent', overrides: ['color'] })
  })
  it('ignora shapes manuais ou papéis inválidos', () => {
    expect(readReifMeta(shape({}))).toBeNull()
    expect(readReifMeta(shape({ reif: { generated: true, role: 'hacker' } }))).toBeNull()
  })
})
