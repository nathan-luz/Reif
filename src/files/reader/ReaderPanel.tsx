import { memo, Suspense, useEffect, useRef, useState } from 'react'
import { stopEventPropagation, TldrawUiIcon, useEditor, useValue } from 'tldraw'
import { IconButton } from '../../ui/IconButton'
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
      className="reif-panel reif-enter pointer-events-auto absolute top-14 right-2 bottom-16 flex w-[min(760px,48vw)] min-w-[320px] flex-col overflow-hidden"
      onPointerDown={stopEventPropagation}
      onWheel={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') closeReader()
      }}
      aria-label={shape.props.title || shape.props.name}
      data-testid="reader-panel"
    >
      <header className="reif-panel-header gap-1 pr-1">
        <TldrawUiIcon icon={KIND_ICON[shape.props.kind]} label="" small />
        <div className="min-w-0 flex-1 pl-1">
          <div className="reif-panel-title truncate">{shape.props.title || shape.props.name}</div>
          <div className="reif-meta truncate">
            {shape.props.stats} · {formatBytes(shape.props.size)}
          </div>
        </div>
        {shape.props.sourceUrl && (
          <a
            className="tlui-button tlui-button__icon"
            href={shape.props.sourceUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir origem"
            title="Abrir origem"
          >
            <TldrawUiIcon icon="external-link" label="" small />
          </a>
        )}
        <IconButton icon="download" label="Baixar" onClick={download} disabled={!blob} />
        <IconButton icon="cross-2" label="Fechar" onClick={closeReader} />
      </header>
      <div ref={body} className="min-h-0 flex-1 overflow-y-auto bg-tl-low">
        {error ? (
          <p className="p-4 text-tl-danger">{error}</p>
        ) : !blob ? (
          <p className="reif-meta reif-pulse p-4">{shape.props.status === 'remote' ? 'Baixando…' : 'Carregando…'}</p>
        ) : Reader ? (
          <Suspense fallback={<p className="reif-meta reif-pulse p-4">Carregando visualizador…</p>}>
            <Reader shape={shape} blob={blob} width={width} />
          </Suspense>
        ) : (
          <p className="reif-meta p-4">Sem visualizador para este formato. Use “Baixar”.</p>
        )}
      </div>
    </aside>
  )
}
