import { memo, Suspense, useEffect, useRef, useState } from 'react'
import { stopEventPropagation, useEditor, useValue } from 'tldraw'
import { FILE_SHAPE, type FileShape } from '../../shapes/file/types'
import { hydrateRemote } from '../importer'
import { getFileBlob } from '../blob'
import { formatBytes, KIND_ICON } from '../kinds'
import { READERS } from './registry'
import { closeReader, readerTarget } from './state'

export const ReaderPanel = memo(function ReaderPanel() {
  const editor = useEditor()
  const id = useValue(readerTarget)
  const shape = useValue('reif:reader-shape', () => (id ? editor.getShape<FileShape>(id) : undefined), [editor, id])
  if (!id || shape?.type !== FILE_SHAPE) return null
  return <Panel key={id} shape={shape} />
})

function Panel({ shape }: { shape: FileShape }) {
  const editor = useEditor()
  const body = useRef<HTMLDivElement>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(640)

  // O Panel é remontado por key ao trocar de arquivo: basta carregar o shape inicial.
  const initial = useRef(shape)
  useEffect(() => {
    let alive = true
    const s = initial.current
    const load = s.props.status === 'remote' ? hydrateRemote(editor, s) : getFileBlob(s)
    load.then((b) => alive && setBlob(b)).catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [editor])

  useEffect(() => {
    const el = body.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const Reader = READERS[shape.props.kind]
  const download = () => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = shape.props.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  return (
    <aside
      className="pointer-events-auto absolute top-14 right-2 bottom-16 flex w-[min(760px,48vw)] min-w-[320px] flex-col overflow-hidden rounded-xl border border-[var(--tl-color-muted-2)] bg-[var(--tl-color-panel)] text-[var(--tl-color-text-1)] shadow-2xl"
      onPointerDown={stopEventPropagation}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') closeReader()
      }}
      data-testid="reader-panel"
    >
      <header className="flex items-center gap-2 border-b border-[var(--tl-color-muted-2)] px-3 py-2">
        <span aria-hidden>{KIND_ICON[shape.props.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{shape.props.title || shape.props.name}</div>
          <div className="text-[11px] text-[var(--tl-color-text-3)]">
            {shape.props.stats} · {formatBytes(shape.props.size)}
          </div>
        </div>
        {shape.props.sourceUrl && (
          <a className="rounded-md px-2 py-1 text-xs hover:bg-[var(--tl-color-muted-2)]" href={shape.props.sourceUrl} target="_blank" rel="noreferrer">
            Origem ↗
          </a>
        )}
        <button type="button" onClick={download} disabled={!blob} className="rounded-md px-2 py-1 text-xs hover:bg-[var(--tl-color-muted-2)] disabled:opacity-40">
          Baixar
        </button>
        <button type="button" onClick={closeReader} aria-label="Fechar" className="rounded-md px-2 py-1 text-sm hover:bg-[var(--tl-color-muted-2)]">
          ✕
        </button>
      </header>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto bg-[var(--tl-color-low)]">
        {error ? (
          <p className="p-4 text-sm text-red-700">{error}</p>
        ) : !blob ? (
          <p className="p-4 text-sm opacity-60">{shape.props.status === 'remote' ? 'Baixando…' : 'Carregando…'}</p>
        ) : Reader ? (
          <Suspense fallback={<p className="p-4 text-sm opacity-60">Carregando visualizador…</p>}>
            <Reader shape={shape} blob={blob} width={width} />
          </Suspense>
        ) : (
          <p className="p-4 text-sm opacity-70">Sem visualizador para este formato. Use “Baixar”.</p>
        )}
      </div>
    </aside>
  )
}
