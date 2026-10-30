import { memo, useEffect, useRef, useState } from 'react'
import type { Slide, SlidesModel } from '../office/models'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

export default function SlidesReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<SlidesModel>(shape, blob)
  if (error) return <p className="p-4 text-tl-danger">{error}</p>
  if (!model) return <p className="reif-meta reif-pulse p-4">Preparando slides…</p>
  return (
    <div className="flex flex-col gap-4 p-4" data-testid="slides-reader">
      {model.slides.map((s, i) => (
        <SlideCard key={i} slide={s} index={i + 1} />
      ))}
      <p className="text-center text-[11px] opacity-50">Prévia de texto e imagens. Para o layout original, exporte o arquivo como PDF.</p>
    </div>
  )
}

/** Imagens do slide só entram no DOM quando o slide chega perto da área visível. */
const SlideCard = memo(function SlideCard({ slide, index }: { slide: Slide; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(index <= 3)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section ref={ref} className="rounded-lg bg-white p-5 text-black shadow" style={{ minHeight: 180 }} data-slide={index}>
      <div className="mb-2 text-[10px] text-black/40">Slide {index}</div>
      {slide.title && <h3 className="mb-2 text-lg font-semibold">{slide.title}</h3>}
      {slide.paragraphs.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {slide.paragraphs.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {near && slide.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slide.images.map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" className="max-h-48 max-w-full rounded object-contain" />
          ))}
        </div>
      )}
      {slide.notes && (
        <details className="mt-3 text-xs text-black/60">
          <summary className="cursor-pointer">Notas do apresentador</summary>
          <p className="mt-1 whitespace-pre-wrap">{slide.notes}</p>
        </details>
      )}
    </section>
  )
})
