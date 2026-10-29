import { openPdf, pdfText } from '../pdfjs'
import { canvasToBlob, excerptOf, plural, type Analyzer } from './types'

const THUMB_WIDTH = 480

export const analyzePdf: Analyzer = async (file) => {
  const doc = await openPdf(file)
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    const thumb = await canvasToBlob(canvas)
    const head = await pdfText(doc, 3, 4000)
    const meta = await doc.getMetadata().catch(() => null)
    const title = (meta?.info as { Title?: string } | undefined)?.Title?.trim()
    return {
      stats: plural(doc.numPages, 'página', 'páginas'),
      excerpt: excerptOf(head),
      ...(title ? { title } : {}),
      thumb,
    }
  } finally {
    void doc.loadingTask.destroy()
  }
}
