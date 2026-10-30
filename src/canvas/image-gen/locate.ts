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
  if (updates.length) editor.run(() => editor.updateBindings(updates), { history: 'ignore' })
  return updates.length
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
