import { useEffect } from 'react'
import {
  createShapeId,
  defaultHandleExternalFileContent,
  defaultHandleExternalUrlContent,
  useEditor,
  useToasts,
  useTranslation,
} from 'tldraw'
import { fetchYouTubeTitle, youtubeShapePartial } from '../shapes/youtube/create'
import { YOUTUBE_DEFAULT_SIZE } from '../shapes/youtube/types'
import { parseYouTubeUrl } from '../shapes/youtube/youtube-url'
import { importFiles, importFromUrl } from '../files/importer'
import { detectKind } from '../files/kinds'

/** URL que aponta para um arquivo suportado (ex.: …/aula.pdf, …/podcast.mp3). */
function fileKindOfUrl(raw: string) {
  try {
    return detectKind(new URL(raw).pathname)
  } catch {
    return null
  }
}

/**
 * Colar/soltar URL do YouTube cria um YouTubeShape (em vez do embed padrão);
 * URLs de arquivos e arquivos locais (não-imagem) viram cartões de arquivo.
 * Precisa estar dentro do contexto de UI do tldraw (toasts/i18n para o fallback).
 */
export function ExternalContentBridge() {
  const editor = useEditor()
  const toasts = useToasts()
  const msg = useTranslation()

  useEffect(() => {
    // Imagens seguem o fluxo nativo do tldraw; o resto vira cartão de arquivo.
    editor.registerExternalContentHandler('files', async (content) => {
      const point = content.point ? { point: content.point } : {}
      const images = content.files.filter((f) => f.type.startsWith('image/'))
      const others = content.files.filter((f) => !f.type.startsWith('image/'))
      if (images.length) await defaultHandleExternalFileContent(editor, { files: images, ...point }, { toasts, msg })
      if (others.length) await importFiles(editor, others, content.point)
    })

    editor.registerExternalContentHandler('url', async (content) => {
      const ref = parseYouTubeUrl(content.url)
      const kind = ref ? null : fileKindOfUrl(content.url)
      if (kind && kind !== 'html') {
        await importFromUrl(editor, content.url, content.point)
        return
      }
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
