import { useEffect } from 'react'
import {
  createShapeId,
  defaultHandleExternalUrlContent,
  useEditor,
  useToasts,
  useTranslation,
} from 'tldraw'
import { fetchYouTubeTitle, youtubeShapePartial } from '../shapes/youtube/create'
import { YOUTUBE_DEFAULT_SIZE } from '../shapes/youtube/types'
import { parseYouTubeUrl } from '../shapes/youtube/youtube-url'

/**
 * Colar/soltar URL do YouTube cria um YouTubeShape (em vez do embed padrão).
 * Precisa estar dentro do contexto de UI do tldraw (toasts/i18n para o fallback).
 */
export function ExternalContentBridge() {
  const editor = useEditor()
  const toasts = useToasts()
  const msg = useTranslation()

  useEffect(() => {
    editor.registerExternalContentHandler('url', async (content) => {
      const ref = parseYouTubeUrl(content.url)
      if (!ref) {
        await defaultHandleExternalUrlContent(
          editor,
          { url: content.url, ...(content.point ? { point: content.point } : {}) },
          { toasts, msg },
        )
        return
      }
      const center = content.point ?? editor.getViewportPageBounds().center
      const id = createShapeId()
      editor.markHistoryStoppingPoint('reif:paste-youtube')
      editor.createShape(
        youtubeShapePartial(id, ref, {
          x: center.x - YOUTUBE_DEFAULT_SIZE.w / 2,
          y: center.y - YOUTUBE_DEFAULT_SIZE.h / 2,
        }),
      )
      editor.select(id)

      const title = await fetchYouTubeTitle(ref.videoId).catch(() => null)
      if (title && editor.getShape(id)) {
        editor.run(() => editor.updateShape({ id, type: 'youtube', props: { title } }), { history: 'ignore' })
      }
    })
  }, [editor, toasts, msg])

  return null
}
