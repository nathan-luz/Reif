import {
  compressLegacySegments,
  getIndices,
  toRichText,
  type TLDrawShape,
  type TLFrameShape,
  type TLGeoShape,
  type TLLineShape,
  type TLNoteShape,
  type TLParentId,
  type TLShapeId,
  type TLShapePartial,
  type TLTextShape,
} from 'tldraw'
import { defaultRoleFor, type DesignSystem, type StyleRole } from '../../shared/design-systems'
import type { Point, ResolvedCreateNode } from '../../shared/mutations'
import { allowedStyleProps, reifMeta, roleProps, type StyleProp } from '../../design-system/styling'
import { youtubeShapePartial } from '../../shapes/youtube/create'
import { IMAGE_SLOT_DEFAULT_SIZE, IMAGE_SLOT_SHAPE, type ImageSlotShape } from '../../shapes/image-slot/types'
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
    case 'image':
      return { x: c.x, y: c.y, w: c.w ?? IMAGE_SLOT_DEFAULT_SIZE.w, h: c.h ?? IMAGE_SLOT_DEFAULT_SIZE.h }
    case 'line':
    case 'draw':
      return unionRect(c.points.map((p) => ({ ...p, w: 0, h: 0 }))) ?? { x: c.x, y: c.y, w: 0, h: 0 }
  }
}

export interface Placement {
  id: TLShapeId
  ds: DesignSystem
  /** Página atual: parent explícito evita que o tldraw "capture" o shape num frame existente. */
  pageId: TLParentId
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

/**
 * Estilo = papel do design system + estilos explícitos do LLM (que viram overrides,
 * para o re-skin não desfazê-los). Retorna também o meta que marca o shape como gerado.
 */
export function styleFor(
  ds: DesignSystem,
  type: string,
  role: StyleRole,
  explicit: Partial<Record<StyleProp, string | undefined>> = {},
) {
  const allowed = allowedStyleProps(type)
  const given = Object.entries(explicit).filter(
    (e): e is [StyleProp, string] => e[1] !== undefined && allowed.includes(e[0] as StyleProp),
  )
  const overrides = given.map(([k]) => k)
  return {
    props: { ...roleProps(ds, role, type, overrides), ...Object.fromEntries(given) },
    meta: reifMeta(role, overrides),
  }
}

const styleOf = (c: ResolvedCreateNode, type: string, ds: DesignSystem) =>
  styleFor(ds, type, c.role ?? defaultRoleFor(c.kind, c.size), {
    color: c.color,
    fill: c.fill,
    dash: c.dash,
    size: c.size,
  })

const relPoints = (points: Point[]) => {
  const o = points[0] ?? { x: 0, y: 0 }
  return { origin: o, rel: points.map((p) => ({ x: p.x - o.x, y: p.y - o.y })) }
}

export function buildCreate(c: ResolvedCreateNode, p: Placement): TLShapePartial | null {
  const base = { id: p.id, parentId: p.parent ? p.parent.id : p.pageId }
  const pos = locate(c, p)
  const richText = toRichText(c.text)

  switch (c.kind) {
    case 'note': {
      const { props, meta } = styleOf(c, 'note', p.ds)
      return { ...base, type: 'note', ...pos, meta, props: { richText, ...props } } as TLShapePartial<TLNoteShape>
    }
    case 'text': {
      const { props, meta } = styleOf(c, 'text', p.ds)
      return { ...base, type: 'text', ...pos, meta, props: { richText, autoSize: true, ...props } } as TLShapePartial<TLTextShape>
    }
    case 'geo': {
      const { w, h } = footprint(c)
      const { props, meta } = styleOf(c, 'geo', p.ds)
      return {
        ...base, type: 'geo', ...pos, meta,
        props: { geo: c.geo ?? 'rectangle', w, h, richText, ...props },
      } as TLShapePartial<TLGeoShape>
    }
    case 'frame': {
      const { w, h } = footprint(c)
      const { props, meta } = styleOf(c, 'frame', p.ds)
      return { ...base, type: 'frame', ...pos, meta, props: { w, h, name: c.text, ...props } } as TLShapePartial<TLFrameShape>
    }
    case 'line': {
      const { origin, rel } = relPoints(c.points)
      const keys = getIndices(rel.length)
      const points = Object.fromEntries(keys.map((k, i) => [k, { id: k, index: k, ...rel[i]! }]))
      const { props, meta } = styleOf(c, 'line', p.ds)
      return {
        ...base, type: 'line', ...locate(origin, p), meta,
        props: { points, spline: c.curved ? 'cubic' : 'line', ...props },
      } as TLShapePartial<TLLineShape>
    }
    case 'draw': {
      const { origin, rel } = relPoints(c.points)
      const first = rel[0]
      const last = rel[rel.length - 1]
      const isClosed = !!first && !!last && rel.length > 2 && Math.hypot(first.x - last.x, first.y - last.y) < 8
      const { props, meta } = styleOf(c, 'draw', p.ds)
      if (!isClosed) delete (props as Record<string, unknown>)['fill']
      return {
        ...base, type: 'draw', ...locate(origin, p), meta,
        props: {
          segments: compressLegacySegments([{ type: 'free', points: rel.map((q) => ({ ...q, z: 0.5 })) }]),
          isComplete: true,
          isClosed,
          ...props,
        },
      } as TLShapePartial<TLDrawShape>
    }
    case 'youtube':
      return c.youtube ? { ...youtubeShapePartial(p.id, { ...c.youtube, start: 0 }, pos), parentId: base.parentId } : null
    case 'image': {
      const { w, h } = footprint(c)
      return {
        ...base, type: IMAGE_SLOT_SHAPE, ...pos,
        props: { w, h, query: c.query?.trim() || c.text },
      } satisfies TLShapePartial<ImageSlotShape>
    }
  }
}
