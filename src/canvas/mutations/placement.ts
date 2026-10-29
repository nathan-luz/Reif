export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const overlaps = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y

export function unionRect(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/**
 * Desloca a composição inteira (como bloco rígido) para a direita até não colidir
 * com o que já existe. Preserva o layout interno pensado pelo LLM. Retorna o dx.
 */
export function groupOffset(rects: Rect[], occupied: Rect[], gap = 40, maxSteps = 200): number {
  const group = unionRect(rects)
  if (!group) return 0
  const r = { ...group }
  for (let i = 0; i < maxSteps; i++) {
    const hit = occupied.find((o) => overlaps(r, o, gap))
    if (!hit) break
    r.x = hit.x + hit.w + gap
  }
  return r.x - group.x
}
