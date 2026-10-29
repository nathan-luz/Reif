import { useEffect, useState } from 'react'
import { highlight } from './highlight'

/** Bloco de código com highlight assíncrono (mostra texto puro até a lib carregar). */
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    // código grande: highlight só até 200 KB (o resto fica em texto puro)
    if (code.length <= 200_000) void highlight(code, lang).then((h) => alive && setHtml(h))
    return () => {
      alive = false
    }
  }, [code, lang])
  return (
    <pre className="reif-code overflow-x-auto rounded-lg p-4 text-[12.5px] leading-relaxed">
      {html === null ? <code>{code}</code> : <code dangerouslySetInnerHTML={{ __html: html }} />}
    </pre>
  )
}
