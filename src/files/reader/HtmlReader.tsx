import { useMemo } from 'react'
import type { HtmlModel } from '../office/models'
import { sanitizeHtml } from './sanitize'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

/** Artigo/página em modo leitura (Readability + sanitização; links abrem em nova aba). */
export default function HtmlReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<HtmlModel>(shape, blob)
  const html = useMemo(() => {
    if (!model) return ''
    const clean = sanitizeHtml(model.html)
    const doc = new DOMParser().parseFromString(clean, 'text/html')
    for (const a of doc.querySelectorAll('a[href]')) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    }
    return doc.body.innerHTML
  }, [model])
  if (error) return <p className="p-4 text-tl-danger">{error}</p>
  if (!model) return <p className="reif-meta reif-pulse p-4">Preparando leitura…</p>
  return (
    <article className="reif-prose p-6" data-testid="html-reader">
      {shape.props.title && <h1>{shape.props.title}</h1>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  )
}
