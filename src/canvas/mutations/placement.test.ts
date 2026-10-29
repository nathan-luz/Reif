import { describe, expect, it } from 'vitest'
import { groupOffset, overlaps, unionRect } from './placement'

describe('placement', () => {
  it('overlaps considera o gap', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 }
    expect(overlaps(a, { x: 120, y: 0, w: 10, h: 10 })).toBe(false)
    expect(overlaps(a, { x: 120, y: 0, w: 10, h: 10 }, 40)).toBe(true)
  })

  it('unionRect', () => {
    expect(unionRect([])).toBeNull()
    expect(unionRect([{ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: -5, w: 10, h: 10 }])).toEqual({ x: 0, y: -5, w: 60, h: 15 })
  })

  it('groupOffset desloca o bloco inteiro para a direita até não colidir', () => {
    const group = [{ x: 0, y: 0, w: 100, h: 100 }, { x: 150, y: 0, w: 100, h: 100 }]
    const occupied = [{ x: 200, y: 50, w: 100, h: 100 }, { x: 330, y: 0, w: 50, h: 50 }]
    const dx = groupOffset(group, occupied, 40)
    // primeiro pula o rect em x=200 (até 340), depois o em x=330 (até 420)
    expect(dx).toBe(420)
  })

  it('sem colisão, dx = 0', () => {
    expect(groupOffset([{ x: 0, y: 0, w: 10, h: 10 }], [{ x: 1000, y: 0, w: 10, h: 10 }])).toBe(0)
  })
})
