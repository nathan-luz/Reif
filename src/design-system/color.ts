type RGB = [number, number, number]

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')}`

/** Interpola a → b (t=0 → a, t=1 → b). */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t])
}

/** Luminância relativa (WCAG). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as RGB
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const readableOn = (bg: string) => (luminance(bg) > 0.45 ? '#1d1d1d' : '#f8f8f8')

export function toDisplayP3(hex: string): string {
  const [r, g, b] = hexToRgb(hex).map((v) => (v / 255).toFixed(4))
  return `color(display-p3 ${r} ${g} ${b})`
}
