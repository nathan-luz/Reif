import { describe, expect, it } from 'vitest'
import { restack } from './locate'

describe('restack (rótulos sem linhas cruzadas)', () => {
  it('ordena os blocos pela altura do alvo, na mesma faixa e espaçamento', () => {
    const blocks = [
      { top: 0, h: 60, targetY: 0.8 },
      { top: 100, h: 40, targetY: 0.1 },
      { top: 180, h: 60, targetY: 0.5 },
    ]
    // faixa 0..240, altura total 160 → espaço 40 entre blocos
    expect(restack(blocks)).toEqual([180, 0, 80])
  })
  it('já ordenado: não move', () => {
    const blocks = [{ top: 0, h: 50, targetY: 0.2 }, { top: 90, h: 50, targetY: 0.6 }]
    expect(restack(blocks)).toEqual([0, 90])
  })
})
