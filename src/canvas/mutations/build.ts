import {
  compressLegacySegments,
  getIndices,
  toRichText,
  type TLDrawShape,
  type TLFrameShape,
  type TLGeoShape,
  type TLLineShape,
  type TLNoteShape,
  type TLShapeId,
  type TLShapePartial,
  type TLTextShape,
} from 'tldraw'
import type { Point, ResolvedCreateNode } from '../../shared/mutations'
import { youtubeShapePartial } from '../../shapes/youtube/create'
import { YOUTUBE_DEFAULT_SIZE } from '../../shapes/youtube/types'
import { unionRect, type Rect } from './placement'

const NOTE = { w: 200, h: 200 }
const GEO = { w: 240, h: 120 }
const TEXT = { w: 240, h: 60 }
const FRAME = { w: 640, h: 420 }

/** Retângulo em coordenadas de página que o nó vai ocupar. */
export function footprint(c: ResolvedCreateNode): Rect {
  switch (c.kind) {
    case 'note':
      return { x: c.x, y: c.y, ...NOTE }
    case 'text':
      return { x: c.x, y: c.y, ...TEXT }
    case 'youtube':
      return { x: c.x, y: c.y, ...YOUTUBE_DEFAULT_SIZE }
    case 'geo':
      return { x: c.x, y: c.y, w: c.w ?? GEO.w, h: c.h ?? GEO.h }
    case 'frame':
      return { x: c.x, y: c.y, w: c.w ?? FRAME.w, h: c.h ?? FRAME.h }
    case 'line':
    case 'draw':
      return unionRect(c.points.map((p) => ({ ...p, w: 0, h: 0 }))) ?? { x: c.x, y: c.y, w: 0, h: 0 }
  }
}

export interface Placement {
  id: TLShapeId
  /** Deslocamento do grupo (já aplicado). */
  dx: number
  /** Frame pai (id e posição de página) se o nó estiver dentro de um frame. */
  parent?: { id: TLShapeId; x: number; y: number }
}

/** Converte coordenadas de página em locais ao pai (frames não rotacionados). */
function locate(page: Point, p: Placement): Point {
  const x = page.x + p.dx
  const y = page.y
  return p.parent ? { x: x - p.parent.x, y: y - p.parent.y } : { x, y }
}

const style = (c: ResolvedCreateNode) => ({
  ...(c.color ? { color: c.color } : {}),
  ...(c.dash ? { dash: c.dash } : {}),
  ...(c.size ? { size: c.size } : {}),
})

const relPoints = (points: Point[]) => {
  const o = points[0] ?? { x: 0, y: 0 }
  return { origin: o, rel: points.map((p) => ({ x: p.x - o.x, y: p.y - o.y })) }
}

export function buildCreate(c: ResolvedCreateNode, p: Placement): TLShapePartial | null {
  const base = { id: p.id, ...(p.parent ? { parentId: p.parent.id } : {}) }
  const pos = locate(c, p)
  const richText = toRichText(c.text)
  const color = c.color ? { color: c.color } : {}

  switch (c.kind) {
    case 'note':
      return { ...base, type: 'note', ...pos, props: { richText, ...color, ...(c.size ? { size: c.size } : {}) } } satisfies TLShapePartial<TLNoteShape>
    case 'text':
      return { ...base, type: 'text', ...pos, props: { richText, autoSize: true, ...color, ...(c.size ? { size: c.size } : {}) } } satisfies TLShapePartial<TLTextShape>
    case 'geo': {
      const { w, h } = footprint(c)
      return {
        ...base, type: 'geo', ...pos,
        props: { geo: c.geo ?? 'rectangle', w, h, richText, ...style(c), ...(c.fill ? { fill: c.fill } : {}) },
      } satisfies TLShapePartial<TLGeoShape>
    }
    case 'frame': {
      const { w, h } = footprint(c)
      return { ...base, type: 'frame', ...pos, props: { w, h, name: c.text, ...color } } satisfies TLShapePartial<TLFrameShape>
    }
    case 'line': {
      const { origin, rel } = relPoints(c.points)
      const keys = getIndices(rel.length)
      const points = Object.fromEntries(keys.map((k, i) => [k, { id: k, index: k, ...rel[i]! }]))
      return {
        ...base, type: 'line', ...locate(origin, p),
        props: { points, spline: c.curved ? 'cubic' : 'line', ...style(c) },
      } satisfies TLShapePartial<TLLineShape>
    }
    case 'draw': {
      const { origin, rel } = relPoints(c.points)
      const first = rel[0]
      const last = rel[rel.length - 1]
      const isClosed = !!first && !!last && rel.length > 2 && Math.hypot(first.x - last.x, first.y - last.y) < 8
      return {
        ...base, type: 'draw', ...locate(origin, p),
        props: {
          segments: compressLegacySegments([{ type: 'free', points: rel.map((q) => ({ ...q, z: 0.5 })) }]),
          isComplete: true,
          isClosed,
          ...style(c),
          ...(c.fill && isClosed ? { fill: c.fill } : {}),
        },
      } satisfies TLShapePartial<TLDrawShape>
    }
    case 'youtube':
      return c.youtube ? youtubeShapePartial(p.id, { ...c.youtube, start: 0 }, pos) : null
  }
}
