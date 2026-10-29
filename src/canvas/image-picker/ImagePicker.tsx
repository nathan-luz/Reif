import { memo, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { stopEventPropagation, useEditor, useValue } from 'tldraw'
import type { ImageHit, ImageSearchResponse, SourceStatus } from '../../shared/images'
import { searchImages } from './api'
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

type Load =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; data: ImageSearchResponse }
  | { status: 'error'; message: string }

function PickerDialog({ state }: { state: ImagePickerState }) {
  const editor = useEditor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(state.query)
  const [query, setQuery] = useState(state.query)
  const [load, setLoad] = useState<Load>(state.query.trim() ? { status: 'loading' } : { status: 'idle' })
  const [inserting, setInserting] = useState<string | null>(null)
  const [insertError, setInsertError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) return
    const ctrl = new AbortController()
    searchImages(query, ctrl.signal)
      .then((data) => setLoad({ status: 'done', data }))
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) setLoad({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => ctrl.abort()
  }, [query])

  const onSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const q = draft.trim()
      if (!q || q === query) return
      setLoad({ status: 'loading' })
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
      className="pointer-events-auto fixed inset-0 z-[1000] flex items-center justify-center bg-black/30"
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

        {load.status === 'done' && (
          <div className="flex flex-wrap gap-1.5 border-b border-black/5 px-3 py-2">
            {load.data.sources.map((s) => (
              <span key={s.source} className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLE[s.status]}`}>
                {SOURCE_LABEL[s.source]}
                {s.status === 'ok' ? ` · ${s.count}` : ` · ${STATUS_HINT[s.status]}`}
              </span>
            ))}
          </div>
        )}
        {insertError && <p className="bg-red-50 px-3 py-1.5 text-xs text-red-700">{insertError}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {load.status === 'loading' && <p className="text-sm text-black/50">Buscando em 5 fontes…</p>}
          {load.status === 'error' && <p className="text-sm text-red-700">{load.message}</p>}
          {load.status === 'idle' && <p className="text-sm text-black/50">Digite o que procura.</p>}
          {load.status === 'done' && load.data.results.length === 0 && (
            <p className="text-sm text-black/50">Nenhuma imagem encontrada.</p>
          )}
          {load.status === 'done' && (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {load.data.results.map((hit) => (
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
