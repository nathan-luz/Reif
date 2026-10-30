import { memo, useState } from 'react'
import { useEditor, useValue } from 'tldraw'
import { ReifIcon } from '../../ui/ReifIcon'
import { ShapeError, ShapeToolbar } from '../shared/ShapeToolbar'
import { runVideoAction, videoJobs } from '../../canvas/video/actions'
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
  const job = useValue('yt:job', () => videoJobs.get()[id], [id])

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
        className="block rounded-tl-2 border-0 bg-black"
        style={{ pointerEvents: isEditing ? 'all' : 'none' }}
      />
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-tl-2 bg-black select-none">
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
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-tl-2 backdrop-blur-sm">
          <ReifIcon name="reif-play" style={{ marginLeft: 2 }} />
        </div>
      </div>
      {videoId && (isFocused || job?.status === 'running') && (
        <ShapeToolbar
          running={job?.status === 'running' ? (job.kind === 'transcript' ? 'Transcrevendo…' : 'Resumindo…') : undefined}
          actions={(['transcript', 'summary'] as const).map((kind) => ({
            id: kind,
            icon: kind === 'transcript' ? 'reif-transcript' : 'reif-sparkle',
            label: kind === 'transcript' ? 'Transcrever' : 'Resumo',
            testId: `yt-${kind}`,
            onRun: () => void runVideoAction(editor, shape, kind),
          }))}
        />
      )}
      {job?.status === 'error' && <ShapeError message={job.message} className="inset-x-2 top-14" />}
      {title && (
        <div className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-sm text-white">
          {title}
        </div>
      )}
    </div>
  )
})
