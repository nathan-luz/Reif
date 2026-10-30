import { useMemo, useState } from 'react'
import { TldrawUiSelect, TldrawUiSelectContent, TldrawUiSelectItem, TldrawUiSelectTrigger, TldrawUiSelectValue } from 'tldraw'
import { IconButton } from '../../ui/IconButton'
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

  if (error) return <p className="p-4 text-tl-danger">{error}</p>
  if (!model) return <p className="reif-meta reif-pulse p-4">Preparando leitura…</p>
  if (model.type === 'html') return <article className="reif-prose p-6" data-testid="doc-reader" dangerouslySetInnerHTML={{ __html: html }} />

  const count = model.chapters.length
  return (
    <div className="flex flex-col" data-testid="doc-reader">
      <nav className="sticky top-0 z-10 flex items-center gap-1 border-b border-tl-divider bg-tl-panel px-1">
        <IconButton icon="chevron-left" label="Capítulo anterior" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} />
        <div className="min-w-0 flex-1">
          <TldrawUiSelect id="reif-chapter" value={String(index)} onValueChange={(v) => setIndex(Number(v))} aria-label="Capítulo">
            <TldrawUiSelectTrigger>
              <TldrawUiSelectValue placeholder="Capítulo" />
            </TldrawUiSelectTrigger>
            <TldrawUiSelectContent side="bottom" align="start">
              {model.chapters.map((c, i) => (
                <TldrawUiSelectItem key={i} value={String(i)} label={`${i + 1}. ${c.title}`} />
              ))}
            </TldrawUiSelectContent>
          </TldrawUiSelect>
        </div>
        <span className="reif-meta px-1 tabular-nums">
          {index + 1}/{count}
        </span>
        <IconButton icon="chevron-right" label="Próximo capítulo" disabled={index >= count - 1} onClick={() => setIndex((i) => i + 1)} />
      </nav>
      <article key={index} className="reif-prose p-6" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
