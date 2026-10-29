import type JSZip from 'jszip'
import { extensionOf } from '../kinds'
import type { Slide, SlidesModel } from '../office/models'
import { byTag, dirOf, imageBudget, imageDataUrl, openZip, readXml, resolvePath } from '../office/zip'
import { canvasToBlob, excerptOf, MAX_TEXT, plural, type Analyzer } from './types'

const paragraphsOf = (root: Element | Document) =>
  byTag(root, 'p')
    .map((p) => byTag(p, 't').map((t) => t.textContent ?? '').join(''))
    .map((t) => t.trim())
    .filter(Boolean)

async function rels(zip: JSZip, path: string): Promise<Map<string, { target: string; type: string }>> {
  const doc = await readXml(zip, `${dirOf(path)}/_rels/${path.split('/').pop()}.rels`)
  return new Map(
    (doc ? byTag(doc, 'Relationship') : []).map((r) => [
      r.getAttribute('Id') ?? '',
      { target: resolvePath(dirOf(path), r.getAttribute('Target') ?? ''), type: r.getAttribute('Type') ?? '' },
    ]),
  )
}

async function pptxSlides(zip: JSZip): Promise<Slide[]> {
  const pres = await readXml(zip, 'ppt/presentation.xml')
  if (!pres) throw new Error('PPTX inválido')
  const presRels = await rels(zip, 'ppt/presentation.xml')
  const order = byTag(pres, 'sldId').map((s) => presRels.get(s.getAttribute('r:id') ?? s.getAttributeNS('*', 'id') ?? '')?.target).filter((t): t is string => Boolean(t))
  const budget = imageBudget()
  const slides: Slide[] = []
  for (const path of order) {
    const doc = await readXml(zip, path)
    if (!doc) continue
    const r = await rels(zip, path)
    const shapes = byTag(doc, 'sp')
    const titleShape = shapes.find((sp) => byTag(sp, 'ph').some((ph) => /title|ctrTitle/.test(ph.getAttribute('type') ?? '')))
    const title = titleShape ? paragraphsOf(titleShape).join(' ') : ''
    const paragraphs = shapes.filter((sp) => sp !== titleShape).flatMap(paragraphsOf)
    const images: string[] = []
    for (const blip of byTag(doc, 'blip')) {
      const target = r.get(blip.getAttribute('r:embed') ?? '')?.target
      const data = target ? await imageDataUrl(zip, target, budget) : null
      if (data) images.push(data)
    }
    const notesPath = [...r.values()].find((x) => x.type.endsWith('/notesSlide'))?.target
    const notesDoc = notesPath ? await readXml(zip, notesPath) : null
    const notes = notesDoc ? paragraphsOf(notesDoc).filter((t) => !/^\d+$/.test(t)).join('\n') : ''
    slides.push({ title, paragraphs, images, notes })
  }
  return slides
}

async function odpSlides(zip: JSZip): Promise<Slide[]> {
  const doc = await readXml(zip, 'content.xml')
  if (!doc) throw new Error('ODP inválido')
  const budget = imageBudget()
  const slides: Slide[] = []
  for (const page of byTag(doc, 'page')) {
    const frames = byTag(page, 'frame').filter((f) => !f.closest('notes'))
    const titleFrame = frames.find((f) => (f.getAttribute('presentation:class') ?? '') === 'title')
    const textOf = (el: Element) => byTag(el, 'p').map((p) => p.textContent?.trim() ?? '').filter(Boolean)
    const images: string[] = []
    for (const img of byTag(page, 'image')) {
      const href = img.getAttribute('xlink:href')
      const data = href ? await imageDataUrl(zip, href, budget) : null
      if (data) images.push(data)
    }
    const notes = byTag(page, 'notes')[0]
    slides.push({
      title: titleFrame ? textOf(titleFrame).join(' ') : '',
      paragraphs: frames.filter((f) => f !== titleFrame).flatMap(textOf),
      images,
      notes: notes ? textOf(notes).join('\n') : '',
    })
  }
  return slides
}

/** Miniatura 16:9 desenhada: título + tópicos (+ 1ª imagem). Sem renderizador de Office. */
async function drawSlideThumb(slide: Slide): Promise<Blob> {
  const W = 640
  const H = 360
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  let textW = W - 64
  const img = slide.images[0]
  if (img) {
    try {
      const bmp = await createImageBitmap(await (await fetch(img)).blob())
      const bw = W * 0.38
      const bh = Math.min(H - 64, (bmp.height / bmp.width) * bw)
      ctx.drawImage(bmp, W - bw - 32, (H - bh) / 2, bw, bh)
      textW = W - bw - 96
    } catch {
      /* imagem ilegível: só texto */
    }
  }
  const wrap = (text: string, x: number, y: number, max: number, lineH: number, maxLines: number) => {
    const words = text.split(/\s+/)
    let line = ''
    let lines = 0
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > max && line) {
        ctx.fillText(line, x, y + lines * lineH)
        line = w
        if (++lines >= maxLines) return lines
      } else line = test
    }
    if (line) ctx.fillText(line, x, y + lines * lineH)
    return lines + 1
  }
  ctx.fillStyle = '#111827'
  ctx.font = 'bold 30px system-ui, sans-serif'
  const tl = wrap(slide.title || slide.paragraphs[0] || '', 32, 64, textW, 36, 2)
  ctx.fillStyle = '#374151'
  ctx.font = '18px system-ui, sans-serif'
  let y = 64 + tl * 36 + 16
  for (const p of slide.paragraphs.slice(slide.title ? 0 : 1, 7)) {
    const n = wrap(`• ${p}`, 40, y, textW - 8, 24, 2)
    y += n * 24 + 6
    if (y > H - 24) break
  }
  return canvasToBlob(canvas)
}

export const analyzeSlides: Analyzer = async (file, name) => {
  const zip = await openZip(file)
  const slides = extensionOf(name) === 'odp' ? await odpSlides(zip) : await pptxSlides(zip)
  const text = slides
    .map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.paragraphs.join('\n')}${s.notes ? `\nNotas: ${s.notes}` : ''}`)
    .join('\n\n')
    .slice(0, MAX_TEXT)
  const model: SlidesModel = { type: 'slides', slides }
  const title = slides[0]?.title
  return {
    stats: plural(slides.length, 'slide', 'slides'),
    excerpt: excerptOf(slides.flatMap((s) => [s.title, ...s.paragraphs]).join(' · ')),
    text,
    model,
    ...(title ? { title } : {}),
    ...(slides[0] ? { thumb: await drawSlideThumb(slides[0]) } : {}),
  }
}
