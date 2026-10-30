import { useCallback, useEffect, useRef, useState } from 'react'

const pickMime = () =>
  ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''

export type RecorderState = 'starting' | 'recording' | 'saving' | 'error'

/** Gravação pelo microfone: começa ao montar; `stop()` devolve o arquivo. Limpa o microfone ao desmontar. */
export function useRecorder() {
  const recorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const started = useRef(0)
  const [state, setState] = useState<RecorderState>('starting')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        const mimeType = pickMime()
        const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        chunks.current = []
        rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        rec.start(1000)
        recorder.current = rec
        started.current = Date.now()
        setState('recording')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Microfone indisponível')
        setState('error')
      })
    return () => {
      cancelled = true
      recorder.current?.stream.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (state !== 'recording') return
    const t = setInterval(() => setElapsed((Date.now() - started.current) / 1000), 250)
    return () => clearInterval(t)
  }, [state])

  const stop = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        const rec = recorder.current
        if (!rec) return resolve(null)
        setState('saving')
        rec.onstop = () => {
          rec.stream.getTracks().forEach((t) => t.stop())
          const type = rec.mimeType || 'audio/webm'
          const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
          const stamp = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-')
          resolve(new File(chunks.current, `Nota de voz ${stamp}.${ext}`, { type }))
        }
        rec.stop()
      }),
    [],
  )

  return { state, elapsed, error, stop }
}
