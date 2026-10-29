import { describe, expect, it } from 'vitest'
import { BAR_HEIGHT, BAR_WIDTH, computeBarPosition } from './position'

const vp = { w: 1200, h: 800 }
const sel = (minX: number, minY: number, maxX: number, maxY: number) => ({ minX, minY, maxY, midX: (minX + maxX) / 2 })

describe('computeBarPosition', () => {
  it('centraliza acima da seleção', () => {
    const p = computeBarPosition(sel(400, 300, 800, 500), vp)
    expect(p).toEqual({ x: 600 - BAR_WIDTH / 2, y: 300 - 12 - BAR_HEIGHT, width: BAR_WIDTH })
  })

  it('vai para baixo quando não cabe acima', () => {
    expect(computeBarPosition(sel(400, 20, 800, 200), vp).y).toBe(212)
  })

  it('fica dentro da viewport nas bordas', () => {
    expect(computeBarPosition(sel(-500, 300, -100, 400), vp).x).toBe(8)
    expect(computeBarPosition(sel(1100, 300, 1500, 400), vp).x).toBe(1200 - BAR_WIDTH - 8)
    expect(computeBarPosition(sel(0, 5, 100, 790), vp).y).toBe(800 - BAR_HEIGHT - 8)
  })

  it('encolhe em viewports estreitas', () => {
    expect(computeBarPosition(sel(0, 300, 100, 400), { w: 300, h: 800 }).width).toBe(284)
  })
})
