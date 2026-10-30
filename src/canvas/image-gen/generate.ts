import { AssetRecordType, atom, createShapeId, type Editor, type TLArrowBinding, type TLImageAsset, type TLShapeId } from 'tldraw'
import type { DesignSystem } from '../../shared/design-systems'
import { IMAGE_SLOT_SHAPE, type ImageSlotShape } from '../../shapes/image-slot/types'
import { notify } from '../notify/notify'
import { removeBackground } from './background'

/** Slots com geração em andamento (o slot mostra "Desenhando…"). */
export const generatingSlots = atom<ReadonlySet<string>>('reif:generating-slots', new Set())
const mark = (id: string, on: boolean) => {
  const next = new Set(generatingSlots.get())
  if (on) next.add(id)
  else next.delete(id)
  generatingSlots.set(next)
}

export interface SlotGenMeta {
  reif?: { generate?: string }
}

export const slotPrompt = (slot: ImageSlotShape) => (slot.meta as SlotGenMeta).reif?.generate?.trim() || ''

/**
 * Gera a ilustração de um slot e o substitui por uma imagem nativa do tldraw (asset no
 * IndexedDB): fundo removido, encaixada no retângulo do slot, setas religadas. Sem novo
 * ponto de histórico — entra no mesmo Ctrl+Z do plano. Devolve o id da imagem.
 */
export async function generateIntoSlot(editor: Editor, slotId: TLShapeId, ds: DesignSystem): Promise<TLShapeId | null> {
  const slot = editor.getShape<ImageSlotShape>(slotId)
  if (!slot || slot.type !== IMAGE_SLOT_SHAPE) return null
  const prompt = slotPrompt(slot)
  if (!prompt) return null
  mark(slotId, true)
  try {
    const res = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, designSystem: ds.id }),
    })
    const body = (await res.json().catch(() => ({}))) as { image?: string; removeBackground?: 'light' | 'dark' | 'none'; error?: string }
    if (!res.ok || !body.image) throw new Error(body.error ?? `HTTP ${res.status}`)
    const blob = await removeBackground(body.image, body.removeBackground ?? 'light')
    const size = await imageSize(blob)
    return await replaceSlot(editor, slotId, new File([blob], `reif-ia-${Date.now()}.png`, { type: 'image/png' }), size, prompt)
  } catch (err) {
    console.warn('[reif] geração de imagem', err)
    // Mantém o slot: o usuário ainda pode buscar uma imagem (query = assunto pedido).
    if (editor.getShape(slotId))
      editor.run(() => editor.updateShape({ id: slotId, type: IMAGE_SLOT_SHAPE, props: { query: prompt } }), { history: 'ignore' })
    notify(`Não foi possível gerar a ilustração: ${err instanceof Error ? err.message : String(err)}`, 'warning')
    return null
  } finally {
    mark(slotId, false)
  }
}

async function imageSize(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  const size = { w: bmp.width, h: bmp.height }
  bmp.close()
  return size
}

async function replaceSlot(editor: Editor, slotId: TLShapeId, file: File, size: { w: number; h: number }, prompt: string) {
  const slot = editor.getShape<ImageSlotShape>(slotId)
  if (!slot) return null
  const assetId = AssetRecordType.createId()
  const asset = AssetRecordType.create({
    id: assetId,
    type: 'image',
    props: { name: file.name, src: null, w: size.w, h: size.h, mimeType: 'image/png', isAnimated: false },
    meta: { reif: { generated: 'ai', prompt } },
  }) as TLImageAsset
  const { src } = await editor.uploadAsset(asset, file)
  // Encaixa (contain) no retângulo do slot, centralizado.
  const k = Math.min(slot.props.w / size.w, slot.props.h / size.h)
  const w = Math.round(size.w * k)
  const h = Math.round(size.h * k)
  const id = createShapeId()
  editor.run(() => {
    editor.createAssets([{ ...asset, props: { ...asset.props, src } }])
    editor.createShape({
      id,
      type: 'image',
      parentId: slot.parentId,
      x: slot.x + (slot.props.w - w) / 2,
      y: slot.y + (slot.props.h - h) / 2,
      props: { assetId, w, h, altText: prompt },
      meta: { reif: { generated: 'ai', prompt, role: (slot.meta as { reif?: { role?: string } }).reif?.role ?? 'primary' } },
    })
    // Setas ligadas ao slot passam a apontar para a imagem.
    const bindings = editor.getBindingsToShape<TLArrowBinding>(slot, 'arrow')
    editor.createBindings(bindings.map((b) => ({ type: 'arrow' as const, fromId: b.fromId, toId: id, props: b.props, meta: b.meta })))
    editor.deleteBindings(bindings)
    editor.deleteShape(slotId)
  })
  return id
}
