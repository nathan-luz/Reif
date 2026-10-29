import { memo, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import type { YouTubeShape } from './types'
import { embedUrl, thumbnailUrl } from './youtube-url'

/** Abaixo desse zoom o iframe é descarregado e volta a thumbnail. */
const MIN_IFRAME_ZOOM = 0.5

/**
 * Thumbnail por padrão. Duplo-clique (modo edição) carrega o iframe; ele permanece
 * enquanto o shape estiver selecionado e o zoom for legível. Cada useValue retorna bool,
 * então pan/zoom contínuos não re-renderizam o componente.
 */
export const YouTubeView = memo(function YouTubeView({ shape }: { shape: YouTubeShape }) {
  const editor = useEditor()
  const { id } = shape
  const { videoId, title, start, w, h } = shape.props

  const isEditing = useValue('yt:editing', () => editor.getEditingShapeId() === id, [editor, id])
  const isFocused = useValue(
    'yt:focused',
    () => {
      const ids = editor.getSelectedShapeIds()
      return ids.length === 1 && ids[0] === id
    },
    [editor, id],
  )
  const zoomOk = useValue('yt:zoom', () => editor.getZoomLevel() >= MIN_IFRAME_ZOOM, [editor])

  // Estado derivado durante o render (sem effect): ativa ao editar, desativa ao perder o foco.
  const [activated, setActivated] = useState(false)
  if (isEditing && !activated) setActivated(true)
  else if (!isEditing && !isFocused && activated) setActivated(false)

  const live = Boolean(videoId) && zoomOk && (isEditing || (activated && isFocused))

  if (live) {
    return (
      <iframe
        src={embedUrl(videoId, start)}
        title={title || 'YouTube'}
        width={w}
        height={h}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="block rounded-lg border-0 bg-black"
        style={{ pointerEvents: isEditing ? 'all' : 'none' }}
      />
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black select-none">
      {videoId && (
        <img
          src={thumbnailUrl(videoId)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="68" height="48" viewBox="0 0 68 48" aria-hidden>
          <path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.2.3 34 .3 34 .3s-21.2 0-26.5 1.4a8.5 8.5 0 0 0-6 6C.1 13 .1 24 .1 24s0 11 1.4 16.3a8.5 8.5 0 0 0 6 6C12.8 47.7 34 47.7 34 47.7s21.2 0 26.5-1.4a8.5 8.5 0 0 0 6-6C67.9 35 67.9 24 67.9 24s0-11-1.4-16.3Z" fill="#f00" />
          <path d="M45 24 27 14v20" fill="#fff" />
        </svg>
      </div>
      {title && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-sm text-white">
          {title}
        </div>
      )}
    </div>
  )
})
