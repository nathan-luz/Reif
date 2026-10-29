import { expect, it } from 'vitest'
import { hexToRgb, luminance, mix, readableOn, rgbToHex, toDisplayP3 } from './color'

it('hex ↔ rgb', () => {
  expect(hexToRgb('#ff8000')).toEqual([255, 128, 0])
  expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  expect(rgbToHex([255, 128, 0])).toBe('#ff8000')
  expect(rgbToHex([300, -5, 12.6])).toBe('#ff000d')
})

it('mix interpola', () => {
  expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
  expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
  expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
})

it('contraste', () => {
  expect(luminance('#ffffff')).toBeCloseTo(1)
  expect(luminance('#000000')).toBe(0)
  expect(readableOn('#ffffff')).toBe('#1d1d1d')
  expect(readableOn('#0b2a5b')).toBe('#f8f8f8')
})

it('display-p3', () => {
  expect(toDisplayP3('#ff0000')).toBe('color(display-p3 1.0000 0.0000 0.0000)')
})
