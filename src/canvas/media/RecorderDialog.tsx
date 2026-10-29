import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TldrawUiButton,
  TldrawUiButtonLabel,
  TldrawUiDialogBody,
  TldrawUiDialogCloseButton,
  TldrawUiDialogHeader,
  TldrawUiDialogTitle,
  useEditor,
  type TLUiDialogProps,
} from 'tldraw'
import { importFiles } from '../../files/importer'
import { formatTime } from '../../shared/video'

const pickMime = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

/** Nota de voz: grava pelo microfone e vira um cartão de áudio (transcrevível). */
export function RecorderDialog({ onClose }: TLUiDialogProps) {
  const editor = useEditor()
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const started = useRef(0)
  const [state, setState] = useState<'idle' | 'recording' | 'saving'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const stopTracks = () => recorder.current?.stream.getTracks().forEach((t) => t.stop())
  useEffect(() => () => stopTracks(), [])

  useEffect(() => {
    if (state !== 'recording') return
    const t = setInterval(() => setElapsed((Date.now() - started.current) / 1000), 250)
    return () => clearInterval(t)
  }, [state])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickMime()
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunks.current = []
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
      rec.start(1000)
      recorder.current = rec
      started.current = Date.now()
      setState('recording')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microfone indisponível')
    }
  }, [])

  const stop = useCallback(() => {
    const rec = recorder.current
    if (!rec) return
    setState('saving')
    rec.onstop = () => {
      stopTracks()
      const type = rec.mimeType || 'audio/webm'
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
      const stamp = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-')
      const file = new File(chunks.current, `Nota de voz ${stamp}.${ext}`, { type })
      onClose()
      void importFiles(editor, [file])
    }
    rec.stop()
  }, [editor, onClose])

  return (
    <>
      <TldrawUiDialogHeader>
        <TldrawUiDialogTitle>Gravar áudio</TldrawUiDialogTitle>
        <TldrawUiDialogCloseButton />
      </TldrawUiDialogHeader>
      <TldrawUiDialogBody style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 16, minWidth: 280 }}>
        <div className="text-3xl tabular-nums" aria-live="polite">
          {state === 'recording' && <span className="mr-2 inline-block h-3 w-3 animate-pulse rounded-full bg-red-600 align-middle" />}
          {formatTime(elapsed)}
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
        {state === 'idle' ? (
          <TldrawUiButton type="primary" onClick={() => void start()} data-testid="record-start">
            <TldrawUiButtonLabel>🎙 Começar</TldrawUiButtonLabel>
          </TldrawUiButton>
        ) : (
          <TldrawUiButton type="primary" onClick={stop} disabled={state === 'saving'} data-testid="record-stop">
            <TldrawUiButtonLabel>{state === 'saving' ? 'Salvando…' : '■ Parar e inserir'}</TldrawUiButtonLabel>
          </TldrawUiButton>
        )}
      </TldrawUiDialogBody>
    </>
  )
}
