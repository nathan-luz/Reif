import { describe, expect, it } from 'vitest'
import { normalizePoint } from './locate'

describe('normalizePoint', () => {
  it('converte a escala nativa 0–1000 do Gemini', () => {
    const all = [{ x: 500, y: 250 }, { x: 0.9, y: 1 }]
    expect(normalizePoint(all[0]!, all)).toEqual({ x: 0.5, y: 0.25 })
    expect(normalizePoint(all[1]!, all).x).toBeCloseTo(0.02)
  })
  it('mantém 0–1 e limita às bordas', () => {
    const all = [{ x: 0.3, y: 1.2 }]
    expect(normalizePoint(all[0]!, all)).toEqual({ x: 0.3, y: 0.98 })
  })
})
