import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { memo, useEffect, useRef, useState } from 'react'
import { openPdf } from '../pdfjs'
import type { ReaderProps } from './types'

/**
 * Só as páginas perto da área visível têm canvas; as distantes são liberadas.
 * Um PDF de 500 páginas custa o mesmo que um de 5.
 */
export default function PdfReader({ blob, width }: ReaderProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [ratio, setRatio] = useState(1.414)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let loaded: PDFDocumentProxy | null = null
    openPdf(blob)
      .then(async (d) => {
        loaded = d
        const vp = (await d.getPage(1)).getViewport({ scale: 1 })
        if (!alive) return
        setRatio(vp.height / vp.width)
        setDoc(d)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
      void loaded?.loadingTask.destroy()
    }
  }, [blob])

  if (error) return <p className="p-4 text-tl-danger">{error}</p>
  if (!doc) return <p className="reif-meta reif-pulse p-4">Abrindo PDF…</p>
  return (
    <div className="flex flex-col items-center gap-3 py-3" data-testid="pdf-reader">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} index={i + 1} width={width - 24} ratio={ratio} />
      ))}
    </div>
  )
}

const PdfPage = memo(function PdfPage({ doc, index, width, ratio }: { doc: PDFDocumentProxy; index: number; width: number; ratio: number }) {
  const holder = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [near, setNear] = useState(index <= 2)

  useEffect(() => {
    const el = holder.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setNear(Boolean(e?.isIntersecting)), { rootMargin: '1500px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!near || !c) return
    let task: RenderTask | null = null
    let cancelled = false
    void doc.getPage(index).then((page) => {
      if (cancelled) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: (width / base.width) * dpr })
      c.width = Math.floor(viewport.width)
      c.height = Math.floor(viewport.height)
      task = page.render({ canvas: c, viewport })
      task.promise.catch(() => {})
    })
    return () => {
      cancelled = true
      task?.cancel()
      // libera a memória do bitmap ao sair de perto
      c.width = 0
      c.height = 0
    }
  }, [near, doc, index, width])

  return (
    <div ref={holder} className="relative bg-white shadow" style={{ width, height: width * ratio }} data-page={index}>
      <canvas ref={canvas} className="block h-full w-full" />
      <span className="absolute right-2 bottom-1 text-[10px] text-black/40">{index}</span>
    </div>
  )
})
