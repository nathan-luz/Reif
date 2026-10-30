import { memo, useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { react, TldrawUiIcon, useEditor, useValue } from 'tldraw'
import { importFiles, importFromUrl } from '../../files/importer'
import { formatTime } from '../../shared/video'
import { IconButton } from '../../ui/IconButton'
import { openImagePicker } from '../image-picker/state'
import { pickFiles } from '../media/pickFiles'
import { closeInsertMenu, insertMenu, type InsertMode } from './state'
import { useRecorder } from './useRecorder'

const TOOL = '[data-testid="tools.asset"]'
const ANCHORS = [TOOL, '[data-testid="tools.more-button"]']
const GAP = 8

/**
 * Popover "Inserir": mesmo padrão do popover de shapes (panel + grade de ícones com tooltip),
 * ancorado acima da ferramenta na toolbar. Link e gravação trocam o conteúdo no próprio popover.
 */
export const InsertPopover = memo(function InsertPopover() {
  const mode = useValue(insertMenu)
  if (!mode) return null
  return <Popover mode={mode} />
})

function Popover({ mode }: { mode: InsertMode }) {
  const editor = useEditor()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  // Ancora no botão da ferramenta (ou no "mais" quando ela está no overflow).
  useLayoutEffect(() => {
    const place = () => {
      const container = editor.getContainer()
      const el = ref.current
      if (!el) return
      const c = container.getBoundingClientRect()
      const anchor = ANCHORS.map((s) => container.querySelector<HTMLElement>(s)).find((a) => a && a.offsetParent !== null)
      const a = anchor?.getBoundingClientRect() ?? { left: c.left + c.width / 2, width: 0, top: c.bottom - 64 }
      const w = el.offsetWidth
      const left = Math.min(Math.max(GAP, a.left - c.left + a.width / 2 - w / 2), c.width - w - GAP)
      setPos({ left, bottom: c.bottom - a.top + GAP })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [editor, mode])

  // Fecha com Esc e com clique fora (o próprio botão da ferramenta alterna).
  useLayoutEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      // Só o próprio botão alterna; o "mais" abre o popover de shapes e deve fechar este.
      if ((t as Element).closest?.(TOOL)) return
      if ((t as Element).closest?.('.tlui-tooltip, [role="dialog"]')) return
      closeInsertMenu()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeInsertMenu()
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Qualquer menu/popover do tldraw que abrir depois (shapes, menu principal, atalhos) fecha este.
  useLayoutEffect(() => {
    let known = new Set(editor.menus.getOpenMenus())
    return react('reif:insert-vs-menus', () => {
      const open = editor.menus.getOpenMenus()
      if (open.some((m) => !known.has(m))) closeInsertMenu()
      known = new Set(open)
    })
  }, [editor])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Inserir"
      data-testid="insert-popover"
      className="reif-panel reif-enter pointer-events-auto absolute"
      style={{ left: pos?.left ?? -9999, bottom: pos?.bottom ?? 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {mode === 'menu' && <MenuGrid />}
      {mode === 'link' && <LinkRow />}
      {mode === 'record' && <RecordRow />}
    </div>
  )
}

function MenuGrid() {
  const editor = useEditor()
  return (
    <div className="reif-grid" role="toolbar" aria-label="Inserir">
      <IconButton
        icon="reif-upload"
        label="Enviar arquivo"
        data-testid="media-upload"
        onClick={() => {
          closeInsertMenu()
          pickFiles(editor)
        }}
      />
      <IconButton
        icon="reif-image-search"
        label="Buscar imagem na web"
        data-testid="media-search-web"
        onClick={() => {
          closeInsertMenu()
          openImagePicker({ query: '' })
        }}
      />
      <IconButton icon="reif-mic" label="Gravar áudio" data-testid="media-record" onClick={() => insertMenu.set('record')} />
      <IconButton icon="reif-link" label="Link de arquivo ou artigo" data-testid="media-link" onClick={() => insertMenu.set('link')} />
    </div>
  )
}

function LinkRow() {
  const editor = useEditor()
  const [url, setUrl] = useState('')
  const valid = /^https?:\/\/\S+$/i.test(url.trim())
  const submit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault()
      if (!valid) return
      closeInsertMenu()
      void importFromUrl(editor, url.trim())
    },
    [editor, url, valid],
  )
  return (
    <form onSubmit={submit} className="flex w-[340px] items-center pr-1">
      <div className="reif-field flex-1">
        <TldrawUiIcon icon="reif-link" label="" small />
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), insertMenu.set('menu'))}
          placeholder="Colar link de arquivo ou artigo"
          aria-label="Link de arquivo ou artigo"
          data-testid="media-link-input"
        />
      </div>
      <IconButton icon="check" label="Adicionar" disabled={!valid} onClick={() => submit()} data-testid="media-link-add" />
      <IconButton icon="cross-2" label="Voltar" onClick={() => insertMenu.set('menu')} />
    </form>
  )
}

function RecordRow() {
  const editor = useEditor()
  const { state, elapsed, error, stop } = useRecorder()
  const finish = useCallback(async () => {
    const file = await stop()
    closeInsertMenu()
    if (file) void importFiles(editor, [file])
  }, [editor, stop])

  if (state === 'error') {
    return (
      <div className="flex w-[300px] items-center pr-1">
        <p className="flex-1 px-3 text-tl-danger">{error ?? 'Microfone indisponível'}</p>
        <IconButton icon="cross-2" label="Voltar" onClick={() => insertMenu.set('menu')} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 pr-1 pl-3" data-testid="recorder">
      <span className={state === 'recording' ? 'reif-pulse text-tl-danger' : 'text-tl-text-3'}>
        <TldrawUiIcon icon="reif-record" label="" small />
      </span>
      <span className="w-14 text-tl-text-1 tabular-nums" aria-live="polite">
        {state === 'starting' ? 'Microfone…' : formatTime(elapsed)}
      </span>
      <IconButton
        icon="reif-stop"
        label="Parar e inserir"
        disabled={state !== 'recording'}
        onClick={() => void finish()}
        data-testid="record-stop"
      />
      <IconButton icon="cross-2" label="Descartar" onClick={() => insertMenu.set('menu')} />
    </div>
  )
}
