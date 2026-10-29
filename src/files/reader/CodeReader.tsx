import { useEffect, useState } from 'react'
import { extensionOf } from '../kinds'
import { CODE_LANG } from '../office/codeLang'
import { CodeBlock } from './CodeBlock'
import type { ReaderProps } from './types'

export default function CodeReader({ shape, blob }: ReaderProps) {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void blob.text().then((t) => alive && setCode(t))
    return () => {
      alive = false
    }
  }, [blob])
  if (code === null) return <p className="p-4 text-sm opacity-60">Carregando…</p>
  return (
    <div className="p-3" data-testid="code-reader">
      <CodeBlock code={code} lang={CODE_LANG[extensionOf(shape.props.name)] ?? 'plaintext'} />
    </div>
  )
}
