import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { sanitizeHtml } from './sanitize'
import type { ReaderProps } from './types'

export default function TextReader({ blob, shape }: ReaderProps) {
  const [html, setHtml] = useState<string | null>(null)
  const [plain, setPlain] = useState<string | null>(null)
  const isMd = /\.(md|markdown)$/i.test(shape.props.name)

  useEffect(() => {
    let alive = true
    void blob.text().then(async (text) => {
      if (!alive) return
      if (isMd) setHtml(sanitizeHtml(await marked.parse(text, { gfm: true })))
      else setPlain(text)
    })
    return () => {
      alive = false
    }
  }, [blob, isMd])

  if (plain !== null) return <pre className="p-5 text-sm leading-relaxed whitespace-pre-wrap">{plain}</pre>
  if (html === null) return <p className="reif-meta reif-pulse p-4">Carregando…</p>
  return <article className="reif-prose p-6" dangerouslySetInnerHTML={{ __html: html }} />
}
