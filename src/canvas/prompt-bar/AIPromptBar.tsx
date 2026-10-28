import { memo, useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Box, stopEventPropagation, useEditor, useQuickReactor } from 'tldraw'
import type { SubgraphPayload } from '../../shared/subgraph'
import { extractSubgraph } from '../subgraph/extract'
import { useSelectionVisible } from '../subgraph/useSelectionVisible'
import { BAR_HEIGHT, computeBarPosition } from './position'

export type PromptSubmitHandler = (prompt: string, payload: SubgraphPayload) => void | Promise<void>

interface Props {
  onSubmit: PromptSubmitHandler
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
  const [busy, setBusy] = useState(false)

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
      try {
        await onSubmit(text, payload)
        setPrompt('')
      } finally {
        setBusy(false)
      }
    },
    [editor, onSubmit, prompt, busy],
  )

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Escape') inputRef.current?.blur()
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
      <span className="text-sm select-none" aria-hidden>
        ✦
      </span>
      <input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={busy}
        placeholder="Transformar seleção…"
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
    </form>
  )
}
