import { describe, expect, it } from 'vitest'
import { loadIcon, resolveIconName } from './doodles'

describe('doodles', () => {
  it('resolve nomes do LLM (kebab, PascalCase, sinônimos, sem acento) para ícones Lucide', () => {
    expect(resolveIconName('lightbulb')).toBe('lightbulb')
    expect(resolveIconName('FlaskConical')).toBe('flask-conical')
    expect(resolveIconName('heart pulse')).toBe('heart-pulse')
    expect(resolveIconName('lupa')).toBe('search')
    expect(resolveIconName('Cérebro')).toBe('brain')
    expect(resolveIconName('nao-existe-xyz')).toBeNull()
  })

  it('carrega o desenho do ícone sob demanda', async () => {
    const node = await loadIcon('lightbulb')
    expect(node?.[0]?.[0]).toBe('path')
  })
})
