import { marked } from 'marked'
import { useMemo } from 'react'
import type { NotebookModel } from '../office/notebook'
import { CodeBlock } from './CodeBlock'
import { sanitizeHtml } from './sanitize'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

export default function NotebookReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<NotebookModel>(shape, blob)
  if (error) return <p className="p-4 text-sm text-red-700">{error}</p>
  if (!model) return <p className="p-4 text-sm opacity-60">Lendo notebook…</p>
  return (
    <div className="flex flex-col gap-3 p-4" data-testid="notebook-reader">
      {model.cells.map((c, i) => (
        <section key={i} data-cell={c.type}>
          {c.type === 'markdown' ? (
            <Markdown source={c.source} />
          ) : (
            <>
              <CodeBlock code={c.source} lang={model.language} />
              {c.outputs.map((o, k) =>
                o.kind === 'image' ? (
                  <img key={k} src={o.data} alt="" className="mt-2 max-w-full rounded bg-white" />
                ) : (
                  <pre key={k} className="mt-2 overflow-x-auto rounded border border-[var(--tl-color-muted-2)] p-3 text-xs whitespace-pre-wrap opacity-80">
                    {o.data}
                  </pre>
                ),
              )}
            </>
          )}
        </section>
      ))}
    </div>
  )
}

function Markdown({ source }: { source: string }) {
  const html = useMemo(() => sanitizeHtml(marked.parse(source, { async: false, gfm: true })), [source])
  return <div className="reif-prose" dangerouslySetInnerHTML={{ __html: html }} />
}
