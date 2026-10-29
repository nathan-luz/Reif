import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type JsonObject,
  type TLImageAsset,
  type TLImageShape,
  type TLShapeId,
} from 'tldraw'
import type { ImageHit } from '../../shared/images'
import { IMAGE_SLOT_SHAPE } from '../../shapes/image-slot/types'
import { fetchImageFile, trackUnsplash } from './api'

const DEFAULT_WIDTH = 480

function attribution(hit: ImageHit): JsonObject {
  const entries = Object.entries({
    source: hit.source,
    title: hit.title,
    author: hit.author,
    authorUrl: hit.authorUrl,
    pageUrl: hit.pageUrl,
    license: hit.license,
  }).filter((e): e is [string, string] => typeof e[1] === 'string')
  return { reif: Object.fromEntries(entries) }
}

const extOf = (url: string) => url.match(/\.(jpe?g|png|gif|webp|svg)(?:[?#]|$)/i)?.[1] ?? 'jpg'

/**
 * Insere a imagem escolhida. Com slot, ocupa o lugar dele (mesmo pai/posição/largura);
 * sem slot, entra no centro da viewport. Unsplash = hotlink; demais → IndexedDB.
 */
export async function insertImage(editor: Editor, hit: ImageHit, slotId?: TLShapeId): Promise<TLShapeId> {
  const slot = slotId ? editor.getShape(slotId) : undefined
  const target = slot?.type === IMAGE_SLOT_SHAPE ? slot : undefined

  const w = target ? (target.props as { w: number }).w : Math.min(DEFAULT_WIDTH, hit.width)
  const h = Math.round((w * hit.height) / hit.width)
  const center = editor.getViewportPageBounds().center
  const pos = target ? { x: target.x, y: target.y, parentId: target.parentId } : { x: center.x - w / 2, y: center.y - h / 2 }

  const assetId = AssetRecordType.createId()
  const name = `${hit.id.replace(':', '-')}.${extOf(hit.url)}`
  const asset = AssetRecordType.create({
    id: assetId,
    type: 'image',
    props: { name, src: null, w: hit.width, h: hit.height, mimeType: null, isAnimated: false },
    meta: attribution(hit),
  }) as TLImageAsset

  let src: string
  if (hit.hotlink) {
    src = hit.url
    if (hit.downloadLocation) trackUnsplash(hit.downloadLocation)
  } else {
    const file = await fetchImageFile(hit.url, name)
    asset.props.mimeType = file.type
    src = (await editor.uploadAsset(asset, file)).src
  }

  const id = createShapeId()
  editor.markHistoryStoppingPoint('reif:insert-image')
  editor.run(() => {
    editor.createAssets([{ ...asset, props: { ...asset.props, src } }])
    if (target) editor.deleteShape(target.id)
    editor.createShape<TLImageShape>({
      id,
      type: 'image',
      ...pos,
      props: { assetId, w, h, altText: hit.title },
      meta: attribution(hit),
    })
    editor.select(id)
  })
  return id
}
