import { memo, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { stopEventPropagation, useEditor } from 'tldraw'
import { getFileBlob } from '../../files/blob'
import { formatTime } from '../../shared/video'
import type { FileShape } from './types'

/** Onda estilizada (determinística) quando não há picos reais (arquivo grande). */
const fallbackPeaks = (n: number) => Array.from({ length: n }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)))

/**
 * O <audio> só é criado no primeiro play; a onda é um <canvas> redesenhado
 * apenas enquanto toca (rAF) — 50 áudios no board não custam nada parados.
 */
export const AudioPlayer = memo(function AudioPlayer({ shape, peaks }: { shape: FileShape; peaks: number[] | undefined }) {
  const editor = useEditor()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState(0)
  const duration = shape.props.duration
  const bars = peaks?.length ? peaks : fallbackPeaks(120)

  const draw = useCallback(
    (progress: number) => {
      const c = canvasRef.current
      if (!c) return
      const dpr = window.devicePixelRatio || 1
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== w * dpr) {
        c.width = w * dpr
        c.height = h * dpr
      }
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const step = w / bars.length
      const style = getComputedStyle(c)
      bars.forEach((p, i) => {
        const bh = Math.max(2, p * h)
        ctx.fillStyle = i / bars.length <= progress ? style.getPropertyValue('--played') : style.getPropertyValue('--idle')
        ctx.fillRect(i * step + 0.5, (h - bh) / 2, Math.max(1, step - 1), bh)
      })
    },
    [bars],
  )

  useEffect(() => draw(duration ? time / duration : 0), [draw, time, duration])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      const a = audioRef.current
      if (a) setTime(a.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  useEffect(
    () => () => {
      audioRef.current?.pause()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const ensureAudio = useCallback(async () => {
    if (audioRef.current) return audioRef.current
    setLoading(true)
    try {
      const blob = await getFileBlob(shape)
      urlRef.current = URL.createObjectURL(blob)
      const a = new Audio(urlRef.current)
      a.onended = () => setPlaying(false)
      audioRef.current = a
      return a
    } finally {
      setLoading(false)
    }
  }, [shape])

  const toggle = useCallback(async () => {
    const a = await ensureAudio()
    if (a.paused) {
      await a.play()
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }, [ensureAudio])

  const seek = useCallback(
    async (e: PointerEvent<HTMLCanvasElement>) => {
      stopEventPropagation(e)
      if (!duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const a = await ensureAudio()
      a.currentTime = ratio * duration
      setTime(a.currentTime)
    },
    [duration, ensureAudio],
  )

  return (
    <div className="flex h-full items-center gap-3 px-3" style={{ pointerEvents: 'all' }}>
      <button
        type="button"
        aria-label={playing ? 'Pausar' : 'Tocar'}
        data-testid="audio-toggle"
        onPointerDown={stopEventPropagation}
        onClick={(e) => {
          e.stopPropagation()
          void toggle().catch((err: unknown) => console.error(err))
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tl-color-text-1)] text-[var(--tl-color-panel)]"
      >
        {loading ? '…' : playing ? '❚❚' : '▶'}
      </button>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => void seek(e)}
        className="h-12 min-w-0 flex-1 cursor-pointer"
        style={{ ['--played' as string]: 'var(--tl-color-selected)', ['--idle' as string]: 'var(--tl-color-text-3)' }}
        data-testid="audio-wave"
        onDoubleClick={() => editor.select(shape.id)}
      />
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--tl-color-text-3)]">
        {formatTime(time)} / {formatTime(duration)}
      </span>
    </div>
  )
})
