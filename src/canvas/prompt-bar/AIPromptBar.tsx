import { memo, useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Box, stopEventPropagation, useEditor, useQuickReactor } from 'tldraw'
import { PROVIDERS, ProviderSchema, type Provider } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import { extractSubgraph } from '../subgraph/extract'
import { useSelectionVisible } from '../subgraph/useSelectionVisible'
import { BAR_HEIGHT, computeBarPosition } from './position'

export interface PromptSubmission {
  prompt: string
  payload: SubgraphPayload
  provider: Provider
}
/** Retorna avisos não fatais (ex.: vídeo não encontrado). */
export type PromptSubmitHandler = (input: PromptSubmission) => Promise<string[]>

interface Props {
  onSubmit: PromptSubmitHandler
}

const PROVIDER_KEY = 'reif:provider'
const PROVIDER_LABEL: Record<Provider, string> = { gemini: 'Gemini', claude: 'Claude' }

function loadProvider(): Provider {
  try {
    return ProviderSchema.catch('gemini').parse(localStorage.getItem(PROVIDER_KEY))
  } catch {
    return 'gemini'
  }
}

function saveProvider(p: Provider) {
  try {
    localStorage.setItem(PROVIDER_KEY, p)
  } catch {
    /* storage indisponível */
  }
}

/** Montado no slot InFrontOfTheCanvas. */
export const AIPromptBar = memo(function AIPromptBar({ onSubmit }: Props) {
  const visible = useSelectionVisible()
  if (!visible) return null
  return <PromptBarInner onSubmit={onSubmit} />
})

function PromptBarInner({ onSubmit }: Props) {
  const editor = useEditor()
  const ref = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState('')
  const [provider, setProvider] = useState<Provider>(loadProvider)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // Posição fora do ciclo do React: reage a câmera/seleção e escreve direto no DOM.
  useQuickReactor(
    'reif:prompt-bar-position',
    () => {
      const el = ref.current
      const page = editor.getSelectionRotatedPageBounds()
      if (!el || !page) return
      const tl = editor.pageToViewport({ x: page.minX, y: page.minY })
      const br = editor.pageToViewport({ x: page.maxX, y: page.maxY })
      const vp = editor.getViewportScreenBounds()
      const { x, y, width } = computeBarPosition(Box.FromPoints([tl, br]), vp)
      el.style.transform = `translate(${x}px, ${y}px)`
      el.style.width = `${width}px`
    },
    [editor],
  )

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const text = prompt.trim()
      const payload = extractSubgraph(editor)
      if (!text || !payload || busy) return
      setBusy(true)
      setError(null)
      setWarning(null)
      try {
        const warnings = await onSubmit({ prompt: text, payload, provider })
        if (warnings.length) setWarning(warnings.join(' · '))
        setPrompt('')
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [editor, onSubmit, prompt, provider, busy],
  )

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation()
    if (e.key === 'Escape') inputRef.current?.blur()
  }, [])

  const handleProvider = useCallback((p: Provider) => {
    setProvider(p)
    saveProvider(p)
  }, [])

  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      onPointerDown={stopEventPropagation}
      onPointerUp={stopEventPropagation}
      onWheel={stopEventPropagation}
      style={{ height: BAR_HEIGHT }}
      className="pointer-events-auto absolute top-0 left-0 flex items-center gap-2 rounded-xl border border-black/10 bg-white/95 px-3 shadow-lg backdrop-blur will-change-transform"
      data-testid="ai-prompt-bar"
    >
      <select
        value={provider}
        onChange={(e) => handleProvider(e.target.value as Provider)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        className="bg-transparent text-xs text-black/60 outline-none"
        aria-label="Modelo"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABEL[p]}
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        placeholder={busy ? 'Pensando…' : 'Transformar seleção…'}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/40"
        aria-label="Prompt para a seleção"
      />
      <button
        type="submit"
        disabled={busy || !prompt.trim()}
        className="rounded-md bg-black px-2.5 py-1 text-xs font-medium text-white disabled:opacity-30"
      >
        {busy ? '…' : 'Enviar'}
      </button>
      {warning && !error && (
        <p className="absolute top-full left-0 mt-1 w-full truncate rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800" title={warning}>
          {warning}
        </p>
      )}
      {error && (
        <p className="absolute top-full left-0 mt-1 w-full truncate rounded-md bg-red-50 px-2 py-1 text-xs text-red-700" title={error}>
          {error}
        </p>
      )}
    </form>
  )
}
