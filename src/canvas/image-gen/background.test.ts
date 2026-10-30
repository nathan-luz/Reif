import { describe, expect, it } from 'vitest'
import { keyOut } from './background'

/** Imagem 20×20: fundo quase branco, quadrado escuro no meio e um "furo" branco dentro dele. */
function sample() {
  const w = 20
  const px = new Uint8ClampedArray(w * w * 4)
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const inSquare = x >= 5 && x < 15 && y >= 5 && y < 15
      const hole = x >= 9 && x < 11 && y >= 9 && y < 11
      const v = inSquare && !hole ? 60 : 250
      px.set([v, v, v, 255], i)
    }
  return { px, w }
}

describe('keyOut (remoção de fundo)', () => {
  it('remove só o fundo conectado à borda; brancos internos ficam', () => {
    const { px, w } = sample()
    keyOut(px, w, w, 'light')
    const alpha = (x: number, y: number) => px[(y * w + x) * 4 + 3]
    expect(alpha(0, 0)).toBe(0)
    expect(alpha(7, 7)).toBe(255)
    expect(alpha(10, 10)).toBe(255) // furo interno preservado
  })

  it('não mexe quando o fundo não é claro', () => {
    const { px, w } = sample()
    for (let i = 0; i < px.length; i += 4) px.set([30, 30, 30], i)
    keyOut(px, w, w, 'light')
    expect(px[3]).toBe(255)
  })
})
