import type JSZip from 'jszip'
import { htmlToText, type ChaptersModel } from '../office/models'
import { byTag, dirOf, imageBudget, imageDataUrl, openZip, parseXml, readXml, resolvePath } from '../office/zip'
import { canvasToBlob, excerptOf, MAX_TEXT, plural, type Analyzer } from './types'

async function coverThumb(zip: JSZip, path: string): Promise<Blob | undefined> {
  const f = zip.file(path)
  if (!f) return undefined
  try {
    const bmp = await createImageBitmap(await f.async('blob'))
    const w = 480
    const h = Math.round((bmp.height / bmp.width) * w)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, w, h)
    return await canvasToBlob(canvas)
  } catch {
    return undefined
  }
}

export const analyzeEpub: Analyzer = async (file) => {
  const zip = await openZip(file)
  const container = await readXml(zip, 'META-INF/container.xml')
  const opfPath = container && byTag(container, 'rootfile')[0]?.getAttribute('full-path')
  if (!opfPath) throw new Error('EPUB sem container.xml')
  const opf = await readXml(zip, opfPath)
  if (!opf) throw new Error('EPUB sem OPF')
  const base = dirOf(opfPath)

  const manifest = new Map(
    byTag(opf, 'item').map((it) => [it.getAttribute('id') ?? '', { href: it.getAttribute('href') ?? '', props: it.getAttribute('properties') ?? '', type: it.getAttribute('media-type') ?? '' }]),
  )
  const title = byTag(opf, 'title')[0]?.textContent?.trim()
  const author = byTag(opf, 'creator')[0]?.textContent?.trim()

  const coverId =
    [...manifest].find(([, v]) => v.props.includes('cover-image'))?.[0] ??
    byTag(opf, 'meta').find((m) => m.getAttribute('name') === 'cover')?.getAttribute('content') ??
    undefined
  const cover = coverId ? manifest.get(coverId) : undefined

  const budget = imageBudget()
  const chapters: ChaptersModel['chapters'] = []
  let fullText = ''
  for (const ref of byTag(opf, 'itemref')) {
    const item = manifest.get(ref.getAttribute('idref') ?? '')
    if (!item || !/html/.test(item.type)) continue
    const path = resolvePath(base, item.href)
    const src = await zip.file(path)?.async('text')
    if (!src) continue
    const doc = parseXml(src, 'application/xhtml+xml')
    const body = doc.querySelector('body') ?? byTag(doc, 'body')[0]
    if (!body) continue
    for (const img of [...body.querySelectorAll('img, image')]) {
      const href = img.getAttribute('src') ?? img.getAttribute('xlink:href') ?? img.getAttribute('href')
      if (!href) continue
      const data = await imageDataUrl(zip, resolvePath(dirOf(path), href), budget)
      if (data && img.localName === 'img') img.setAttribute('src', data)
      else img.remove()
    }
    const html = body.innerHTML
    const text = htmlToText(html)
    if (!text.trim() && !html.includes('<img')) continue
    const heading = body.querySelector('h1, h2, h3')?.textContent?.trim()
    chapters.push({ title: heading || `Capítulo ${chapters.length + 1}`, html })
    if (fullText.length < MAX_TEXT) fullText += `${text}\n\n`
  }

  const model: ChaptersModel = { type: 'chapters', chapters }
  const thumb = cover ? await coverThumb(zip, resolvePath(base, cover.href)) : undefined
  return {
    stats: plural(chapters.length, 'capítulo', 'capítulos') + (author ? ` · ${author}` : ''),
    excerpt: excerptOf(fullText),
    text: fullText.slice(0, MAX_TEXT),
    model,
    ...(title ? { title } : {}),
    ...(thumb ? { thumb } : {}),
  }
}
