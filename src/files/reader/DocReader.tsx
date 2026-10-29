import { useMemo, useState } from 'react'
import type { ChaptersModel, HtmlModel } from '../office/models'
import { sanitizeHtml } from './sanitize'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

/** DOCX/ODT/RTF (HTML único) e EPUB (capítulos: só o atual fica no DOM). */
export default function DocReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<HtmlModel | ChaptersModel>(shape, blob)
  const [index, setIndex] = useState(0)
  const chapter = model?.type === 'chapters' ? model.chapters[index] : undefined
  const html = useMemo(
    () => (model?.type === 'html' ? sanitizeHtml(model.html) : chapter ? sanitizeHtml(chapter.html) : ''),
    [model, chapter],
  )

  if (error) return <p className="p-4 text-sm text-red-700">{error}</p>
  if (!model) return <p className="p-4 text-sm opacity-60">Preparando leitura…</p>
  if (model.type === 'html') return <article className="reif-prose p-6" data-testid="doc-reader" dangerouslySetInnerHTML={{ __html: html }} />

  const count = model.chapters.length
  return (
    <div className="flex flex-col" data-testid="doc-reader">
      <nav className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--tl-color-muted-2)] bg-[var(--tl-color-panel)] px-3 py-2 text-xs">
        <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="rounded px-2 py-1 disabled:opacity-30">
          ←
        </button>
        <select
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="min-w-0 flex-1 bg-transparent outline-none"
          aria-label="Capítulo"
        >
          {model.chapters.map((c, i) => (
            <option key={i} value={i}>
              {i + 1}. {c.title}
            </option>
          ))}
        </select>
        <button type="button" disabled={index >= count - 1} onClick={() => setIndex((i) => i + 1)} className="rounded px-2 py-1 disabled:opacity-30">
          →
        </button>
      </nav>
      <article key={index} className="reif-prose p-6" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
