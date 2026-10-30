import type { Box } from 'tldraw'

export const BAR_WIDTH = 420
export const BAR_HEIGHT = 40
const GAP = 12
const MARGIN = 8

export interface Viewport {
  w: number
  h: number
}

/** Rect da seleção já em coordenadas de viewport. Função pura para teste unitário. */
export function computeBarPosition(sel: Pick<Box, 'minX' | 'minY' | 'maxY' | 'midX'>, vp: Viewport) {
  const width = Math.min(BAR_WIDTH, vp.w - MARGIN * 2)
  const x = clamp(sel.midX - width / 2, MARGIN, vp.w - width - MARGIN)
  const above = sel.minY - GAP - BAR_HEIGHT
  const below = sel.maxY + GAP
  const y = above >= MARGIN ? above : clamp(below, MARGIN, vp.h - BAR_HEIGHT - MARGIN)
  return { x, y, width }
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
