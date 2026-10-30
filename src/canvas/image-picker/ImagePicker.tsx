import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { stopEventPropagation, TldrawUiButton, TldrawUiButtonLabel, TldrawUiIcon, useEditor, useValue } from 'tldraw'
import { IconButton } from '../../ui/IconButton'
import { IMAGE_SOURCES, interleave, type ImageHit, type ImageSource, type SourceStatus } from '../../shared/images'
import { searchAllSources, type SourceResult } from './api'
import { insertImage } from './insert'
import { closeImagePicker, imagePicker, type ImagePickerState } from './state'

const SOURCE_LABEL: Record<SourceStatus['source'], string> = {
  unsplash: 'Unsplash',
  pixabay: 'Pixabay',
  pexels: 'Pexels',
  wikimedia: 'Wikimedia',
  openverse: 'Openverse',
}

const STATUS_TONE: Record<SourceStatus['status'], 'default' | 'muted' | 'warning' | 'danger'> = {
  ok: 'default',
  empty: 'muted',
  quota: 'warning',
  error: 'danger',
  unconfigured: 'muted',
}

const STATUS_HINT: Record<SourceStatus['status'], string> = {
  ok: '',
  empty: 'sem resultados',
  quota: 'cota esgotada',
  error: 'erro',
  unconfigured: 'sem chave',
}

/** Montado nas sobreposições (ReifOverlays); abre via atom `imagePicker`. */
export const ImagePicker = memo(function ImagePicker() {
  const state = useValue(imagePicker)
  if (!state) return null
  // key: reinicia o estado interno a cada abertura
  return <PickerDialog key={`${state.slotId ?? 'free'}:${state.query}`} state={state} />
})

type Results = Partial<Record<ImageSource, SourceResult>>

function PickerDialog({ state }: { state: ImagePickerState }) {
  const editor = useEditor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(state.query)
  const [query, setQuery] = useState(state.query)
  const [results, setResults] = useState<Results>({})
  const [inserting, setInserting] = useState<string | null>(null)
  const [insertError, setInsertError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) return
    const ctrl = new AbortController()
    void searchAllSources(query, ctrl.signal, (source, result) =>
      setResults((prev) => ({ ...prev, [source]: result })),
    )
    return () => ctrl.abort()
  }, [query])

  // Ordem fixa das fontes → intercalação estável enquanto os resultados chegam.
  const hits = useMemo(() => interleave(IMAGE_SOURCES.map((s) => results[s]?.hits ?? [])), [results])
  const pending = query.trim() ? IMAGE_SOURCES.filter((s) => !results[s]) : []

  const onSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const q = draft.trim()
      if (!q || q === query) return
      setResults({})
      setQuery(q)
    },
    [draft, query],
  )

  const onPick = useCallback(
    async (hit: ImageHit) => {
      setInserting(hit.id)
      setInsertError(null)
      try {
        await insertImage(editor, hit, state.slotId)
        closeImagePicker()
      } catch (err) {
        setInsertError(err instanceof Error ? err.message : String(err))
      } finally {
        setInserting(null)
      }
    },
    [editor, state.slotId],
  )

  return (
    <div
      className="reif-enter pointer-events-auto absolute inset-0 flex items-center justify-center bg-tl-overlay"
      onPointerDown={(e) => {
        stopEventPropagation(e)
        if (e.target === e.currentTarget) closeImagePicker()
      }}
      onWheel={stopEventPropagation}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') closeImagePicker()
      }}
      data-testid="image-picker"
    >
      <div role="dialog" aria-label="Buscar imagem na web" className="reif-panel flex h-[80vh] w-[min(960px,94vw)] flex-col overflow-hidden">
        <header className="reif-panel-header pr-1">
          <h2 className="reif-panel-title">Buscar imagem na web</h2>
          <IconButton icon="cross-2" label="Fechar" onClick={closeImagePicker} />
        </header>
        <form onSubmit={onSearch} className="flex items-center border-b border-tl-divider pr-1">
          <div className="reif-field flex-1">
            <TldrawUiIcon icon="reif-search" label="" small />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Buscar imagens…"
              aria-label="Buscar imagens"
            />
          </div>
          <TldrawUiButton type="primary" htmlButtonType="submit">
            <TldrawUiButtonLabel>Buscar</TldrawUiButtonLabel>
          </TldrawUiButton>
        </form>

        {query.trim() && (
          <div className="flex flex-wrap gap-1.5 px-3 py-2">
            {IMAGE_SOURCES.map((source) => {
              const s = results[source]?.status
              if (!s)
                return (
                  <span key={source} className="reif-chip reif-pulse" data-tone="muted">
                    {SOURCE_LABEL[source]} · …
                  </span>
                )
              return (
                <span
                  key={source}
                  className={`reif-chip${s.status === 'unconfigured' ? ' line-through' : ''}`}
                  data-tone={STATUS_TONE[s.status]}
                  title={STATUS_HINT[s.status] || undefined}
                >
                  {SOURCE_LABEL[source]}
                  {s.status === 'ok' ? ` · ${s.count}` : ` · ${STATUS_HINT[s.status]}`}
                </span>
              )
            })}
          </div>
        )}
        {insertError && <p className="px-3 pb-2 text-tl-danger">{insertError}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto bg-tl-low p-3">
          {!query.trim() && <p className="reif-meta pt-6 text-center">Digite o que procura.</p>}
          {query.trim() && hits.length === 0 && (
            <p className="reif-meta pt-6 text-center">{pending.length ? 'Buscando…' : 'Nenhuma imagem encontrada.'}</p>
          )}
          {hits.length > 0 && (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {hits.map((hit) => (
                <ImageTile key={hit.id} hit={hit} busy={inserting === hit.id} disabled={inserting !== null} onPick={onPick} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ImageTile = memo(function ImageTile({
  hit,
  busy,
  disabled,
  onPick,
}: {
  hit: ImageHit
  busy: boolean
  disabled: boolean
  onPick: (hit: ImageHit) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(hit)}
      className="group relative mb-3 block w-full overflow-hidden rounded-tl-2 bg-tl-panel text-left shadow-tl-1 outline-offset-2 hover:outline-2 hover:outline-tl-selected focus-visible:outline-2 focus-visible:outline-tl-focus disabled:opacity-60"
      style={{ aspectRatio: `${hit.width} / ${hit.height}` }}
      title={hit.title}
    >
      <img src={hit.thumb} alt={hit.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      {/* sobre a foto: legenda clara em degradê (a foto não segue o tema) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[11px] text-white opacity-0 transition-opacity duration-100 group-hover:opacity-100">
        <div className="truncate">{hit.title}</div>
        <div className="truncate text-white/70">
          {SOURCE_LABEL[hit.source]}
          {hit.author ? ` · ${hit.author}` : ''}
          {hit.license ? ` · ${hit.license}` : ''}
        </div>
      </div>
      {busy && <div className="reif-pulse absolute inset-0 flex items-center justify-center bg-tl-panel/70 text-tl-text-1">Inserindo…</div>}
    </button>
  )
})
