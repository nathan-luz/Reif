import { memo, useCallback, useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react'
import {
  Box,
  stopEventPropagation,
  TldrawUiIcon,
  TldrawUiSelect,
  TldrawUiSelectContent,
  TldrawUiSelectItem,
  TldrawUiSelectTrigger,
  TldrawUiSelectValue,
  useEditor,
  useQuickReactor,
  useValue,
} from 'tldraw'
import { IconButton } from '../../ui/IconButton'
import { PROVIDERS, ProviderSchema, type Provider } from '../../shared/mutations'
import type { SubgraphPayload } from '../../shared/subgraph'
import { extractSubgraph, extractViewportContext } from '../subgraph/extract'
import { usePromptBarMode, type PromptBarMode } from '../subgraph/useSelectionVisible'
import { BAR_HEIGHT, computeBarPosition } from './position'
import { promptBarOpen } from './state'

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

/** Barra contextual sobre a seleção (montada em ReifOverlays). */
export const AIPromptBar = memo(function AIPromptBar({ onSubmit }: Props) {
  const mode = usePromptBarMode()
  if (mode === 'hidden') return null
  return <PromptBarInner onSubmit={onSubmit} mode={mode} />
})

const VIEWPORT_TOP = 72

function PromptBarInner({ onSubmit, mode }: Props & { mode: Exclude<PromptBarMode, 'hidden'> }) {
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
      if (!el) return
      const vp = editor.getViewportScreenBounds()
      const page = editor.getSelectionRotatedPageBounds()
      const sel = page
        ? Box.FromPoints([
            editor.pageToViewport({ x: page.minX, y: page.minY }),
            editor.pageToViewport({ x: page.maxX, y: page.maxY }),
          ])
        : new Box(vp.w / 2, VIEWPORT_TOP + BAR_HEIGHT + 12, 0, 0)
      const { x, y, width } = computeBarPosition(sel, vp)
      el.style.transform = `translate(${x}px, ${y}px)`
      el.style.width = `${width}px`
    },
    [editor],
  )

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const text = prompt.trim()
      const payload = mode === 'selection' ? extractSubgraph(editor) : extractViewportContext(editor)
      if (!text || !payload || busy) return
      setBusy(true)
      setError(null)
      setWarning(null)
      try {
        const warnings = await onSubmit({ prompt: text, payload, provider })
        if (warnings.length) setWarning(warnings.join(' · '))
        setPrompt('')
        promptBarOpen.set(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [editor, onSubmit, prompt, provider, busy, mode],
  )

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      promptBarOpen.set(false)
      inputRef.current?.blur()
    }
  }, [])

  // Atalho "/" foca o input; sem seleção, a barra nasce focada.
  const open = useValue(promptBarOpen)
  useEffect(() => {
    if (open || mode === 'viewport') inputRef.current?.focus()
  }, [open, mode])

  // O dropdown de modelo abre fora do <form> (portal): não conta como "perder o foco".
  const selectOpen = useRef(false)
  const handleBlur = useCallback(
    (e: FocusEvent<HTMLFormElement>) => {
      if (busy || selectOpen.current) return
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) promptBarOpen.set(false)
    },
    [busy],
  )

  const handleProvider = useCallback((p: string) => {
    const next = ProviderSchema.catch('gemini').parse(p)
    setProvider(next)
    saveProvider(next)
  }, [])

  const notice = error ?? warning
  return (
    <form
      ref={ref}
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      onPointerDown={stopEventPropagation}
      onPointerUp={stopEventPropagation}
      onWheel={stopEventPropagation}
      style={{ height: BAR_HEIGHT }}
      className="reif-panel pointer-events-auto absolute top-0 left-0 flex items-center will-change-transform"
      data-testid="ai-prompt-bar"
    >
      <span className={`flex shrink-0 pr-2 pl-3 text-tl-text-3 ${busy ? 'reif-pulse' : ''}`}>
        <TldrawUiIcon icon="reif-sparkle" label="" small />
      </span>
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        placeholder={busy ? 'Pensando…' : mode === 'selection' ? 'Transformar seleção…' : 'Desenhar aqui…'}
        className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-tl-text-1 outline-none placeholder:text-tl-text-3"
        aria-label="Prompt para a seleção"
      />
      <TldrawUiSelect
        id="reif-provider"
        value={provider}
        onValueChange={handleProvider}
        onOpenChange={(o) => (selectOpen.current = o)}
        disabled={busy}
        aria-label="Modelo"
        data-testid="ai-provider"
      >
        <TldrawUiSelectTrigger>
          <TldrawUiSelectValue placeholder="Modelo" />
        </TldrawUiSelectTrigger>
        <TldrawUiSelectContent side="top" align="end">
          {PROVIDERS.map((p) => (
            <TldrawUiSelectItem key={p} value={p} label={PROVIDER_LABEL[p]} />
          ))}
        </TldrawUiSelectContent>
      </TldrawUiSelect>
      <IconButton icon="reif-send" label="Enviar (Enter)" disabled={busy || !prompt.trim()} onClick={() => ref.current?.requestSubmit()} />
      {notice && (
        <p
          role="status"
          className={`reif-panel reif-enter absolute top-full left-0 mt-2 w-full truncate px-3 py-2 ${error ? 'text-tl-danger' : 'text-tl-warning'}`}
          title={notice}
        >
          {notice}
        </p>
      )}
    </form>
  )
}
