import { useEffect, useRef } from 'react'
import type { ReaderProps } from './types'

/** O <video> só existe com o painel aberto (o cartão no canvas é só a capa). */
export default function VideoReader({ blob }: ReaderProps) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const url = URL.createObjectURL(blob)
    el.src = url
    return () => {
      el.removeAttribute('src')
      URL.revokeObjectURL(url)
    }
  }, [blob])
  return (
    <div className="p-3" data-testid="video-reader">
      <video ref={ref} controls className="w-full rounded-tl-2 bg-black" />
    </div>
  )
}
