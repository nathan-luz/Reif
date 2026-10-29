import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { stopEventPropagation, useEditor, useValue } from 'tldraw'
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

const STATUS_STYLE: Record<SourceStatus['status'], string> = {
  ok: 'bg-emerald-50 text-emerald-700',
  empty: 'bg-black/5 text-black/50',
  quota: 'bg-amber-50 text-amber-800',
  error: 'bg-red-50 text-red-700',
  unconfigured: 'bg-black/5 text-black/35 line-through',
}

const STATUS_HINT: Record<SourceStatus['status'], string> = {
  ok: '',
  empty: 'sem resultados',
  quota: 'cota esgotada',
  error: 'erro',
  unconfigured: 'sem chave',
}

/** Montado no InFrontOfTheCanvas; abre via atom `imagePicker`. */
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
      className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/30"
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
      <div className="flex h-[80vh] w-[min(960px,94vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <form onSubmit={onSearch} className="flex items-center gap-2 border-b border-black/10 p-3">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Buscar imagens…"
            className="min-w-0 flex-1 rounded-lg bg-black/5 px-3 py-2 text-sm outline-none"
            aria-label="Buscar imagens"
          />
          <button type="submit" className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white">
            Buscar
          </button>
          <button
            type="button"
            onClick={closeImagePicker}
            className="rounded-lg px-2 py-2 text-sm text-black/50 hover:bg-black/5"
            aria-label="Fechar"
          >
            ✕
          </button>
        </form>

        {query.trim() && (
          <div className="flex flex-wrap gap-1.5 border-b border-black/5 px-3 py-2">
            {IMAGE_SOURCES.map((source) => {
              const s = results[source]?.status
              if (!s)
                return (
                  <span key={source} className="animate-pulse rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/40">
                    {SOURCE_LABEL[source]} · …
                  </span>
                )
              return (
                <span key={source} className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[s.status]}`}>
                  {SOURCE_LABEL[source]}
                  {s.status === 'ok' ? ` · ${s.count}` : ` · ${STATUS_HINT[s.status]}`}
                </span>
              )
            })}
          </div>
        )}
        {insertError && <p className="bg-red-50 px-3 py-1.5 text-xs text-red-700">{insertError}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {!query.trim() && <p className="text-sm text-black/50">Digite o que procura.</p>}
          {query.trim() && hits.length === 0 && (
            <p className="text-sm text-black/50">{pending.length ? 'Buscando…' : 'Nenhuma imagem encontrada.'}</p>
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
      className="group relative mb-3 block w-full overflow-hidden rounded-lg bg-black/5 text-left disabled:opacity-60"
      style={{ aspectRatio: `${hit.width} / ${hit.height}` }}
      title={hit.title}
    >
      <img src={hit.thumb} alt={hit.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pt-6 pb-1.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        <div className="truncate">{hit.title}</div>
        <div className="truncate text-white/70">
          {SOURCE_LABEL[hit.source]}
          {hit.author ? ` · ${hit.author}` : ''}
          {hit.license ? ` · ${hit.license}` : ''}
        </div>
      </div>
      {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-xs">Inserindo…</div>}
    </button>
  )
})
