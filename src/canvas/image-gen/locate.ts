import type { Editor, TLArrowBinding, TLImageShape, TLShapeId } from 'tldraw'

/**
 * Ilustração rotulada: pede ao Gemini (visão) onde cada parte está na imagem e move a
 * ponta de cada linha-guia para lá. Falhou? As linhas continuam na borda — nada quebra.
 */
export async function pointLeaderLines(editor: Editor, imageId: TLShapeId, subject?: string): Promise<number> {
  const image = editor.getShape<TLImageShape>(imageId)
  if (!image?.props.assetId) return 0
  const asset = editor.getAsset(image.props.assetId)
  const src = asset && 'src' in asset.props ? await editor.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true }) : null
  if (!src) return 0

  // Ponta de cada seta que encosta na imagem + o texto do rótulo na outra ponta.
  const ends = editor
    .getBindingsToShape<TLArrowBinding>(image, 'arrow')
    .map((b) => {
      const other = editor.getBindingsFromShape<TLArrowBinding>(b.fromId, 'arrow').find((o) => o.toId !== imageId)
      const shape = other ? editor.getShape(other.toId) : undefined
      const label = shape ? (editor.getShapeUtil(shape).getText(shape) ?? '').split('\n')[0]!.trim() : ''
      return { binding: b, label }
    })
    .filter((e) => e.label)
  if (!ends.length) return 0

  const res = await fetch('/api/images/locate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: await downscale(src, 640), labels: ends.map((e) => e.label), ...(subject ? { subject } : {}) }),
  })
  if (!res.ok) return 0
  const { points } = (await res.json()) as { points: { label: string; x: number; y: number }[] }
  const byLabel = new Map(points.map((p) => [p.label.trim().toLowerCase(), p]))
  const updates = ends.flatMap(({ binding, label }) => {
    const p = byLabel.get(label.toLowerCase())
    return p ? [{ ...binding, props: { ...binding.props, normalizedAnchor: { x: p.x, y: p.y }, isPrecise: true, isExact: true } }] : []
  })
  if (!updates.length) return 0
  editor.run(
    () => {
      editor.updateBindings(updates)
      untangle(editor, image, ends.flatMap(({ binding, label }) => {
        const p = byLabel.get(label.toLowerCase())
        const other = editor.getBindingsFromShape<TLArrowBinding>(binding.fromId, 'arrow').find((o) => o.toId !== imageId)
        return p && other ? [{ termId: other.toId, y: p.y }] : []
      }))
    },
    { history: 'ignore' },
  )
  return updates.length
}

/**
 * Reordena os rótulos de cada lado pela altura da parte apontada: o rótulo de cima aponta
 * para a parte mais alta e as linhas-guia não se cruzam. Cada bloco é o termo mais o que
 * está colado logo abaixo dele (a descrição).
 */
function untangle(editor: Editor, image: TLImageShape, targets: { termId: TLShapeId; y: number }[]) {
  const ib = editor.getShapePageBounds(image)
  if (!ib) return
  const all = editor.getCurrentPageShapes().filter((s) => s.parentId === editor.getCurrentPageId() && s.type !== 'arrow')
  const blockOf = (termId: TLShapeId): TLShapeId[] => {
    const ids = [termId]
    let last = editor.getShapePageBounds(termId)
    while (last) {
      const below = all.find((s) => {
        const b = editor.getShapePageBounds(s)
        return b && !ids.includes(s.id) && b.y >= last!.maxY - 2 && b.y <= last!.maxY + 24 && b.minX < last!.maxX && b.maxX > last!.minX
      })
      if (!below) break
      ids.push(below.id)
      last = editor.getShapePageBounds(below)
    }
    return ids
  }
  for (const left of [true, false]) {
    const side = targets.filter((t) => {
      const b = editor.getShapePageBounds(t.termId)
      return b && b.center.x < ib.center.x === left
    })
    if (side.length < 2) continue
    const blocks = side.map((t) => {
      const ids = blockOf(t.termId)
      const bounds = ids.map((id) => editor.getShapePageBounds(id)!)
      const top = Math.min(...bounds.map((b) => b.y))
      return { ids, top, h: Math.max(...bounds.map((b) => b.maxY)) - top, targetY: t.y }
    })
    const tops = restack(blocks)
    editor.updateShapes(
      blocks.flatMap((b, i) => {
        const dy = tops[i]! - b.top
        return dy ? b.ids.map((id) => ({ id, type: editor.getShape(id)!.type, y: editor.getShape(id)!.y + dy })) : []
      }),
    )
  }
}

/** Novas posições (topo) dos blocos: mesma faixa e espaçamento, ordenados pelo alvo. Exportada para teste. */
export function restack(blocks: { top: number; h: number; targetY: number }[]): number[] {
  const bySlot = [...blocks].sort((a, b) => a.top - b.top)
  const span = bySlot.at(-1)!.top + bySlot.at(-1)!.h - bySlot[0]!.top
  const gap = Math.max(0, (span - blocks.reduce((s, b) => s + b.h, 0)) / Math.max(1, blocks.length - 1))
  const order = [...blocks].sort((a, b) => a.targetY - b.targetY)
  const tops = new Map<(typeof blocks)[number], number>()
  let y = bySlot[0]!.top
  for (const b of order) {
    tops.set(b, y)
    y += b.h + gap
  }
  return blocks.map((b) => tops.get(b)!)
}

async function downscale(src: string, max: number): Promise<string> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  await img.decode()
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(img.naturalWidth * k)
  c.height = Math.round(img.naturalHeight * k)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff' // fundo transparente → branco (o modelo enxerga melhor)
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}
