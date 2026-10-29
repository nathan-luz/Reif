export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const overlaps = (a: Rect, b: Rect, gap: number) =>
  a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y

/**
 * Empurra o rect para a direita até não colidir com nenhum ocupado.
 * Pura e determinística (testável). `occupied` é mutado com o resultado.
 */
export function placeWithoutOverlap(rect: Rect, occupied: Rect[], gap = 40, maxSteps = 200): Rect {
  const r = { ...rect }
  for (let i = 0; i < maxSteps; i++) {
    const hit = occupied.find((o) => overlaps(r, o, gap))
    if (!hit) break
    r.x = hit.x + hit.w + gap
  }
  occupied.push(r)
  return r
}
