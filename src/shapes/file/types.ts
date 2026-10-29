import type { TLShape } from 'tldraw'
import type { FileKind } from '../../files/kinds'

export const FILE_SHAPE = 'file' as const

export type FileStatus = 'analyzing' | 'ready' | 'remote' | 'error'

export interface FileShapeProps {
  w: number
  h: number
  kind: FileKind
  name: string
  mime: string
  size: number
  /** Chave no IndexedDB ('' = arquivo só por link). */
  fileId: string
  /** Origem web (cópia ou link). */
  sourceUrl: string
  status: FileStatus
  /** Ex.: "12 páginas", "3:42", "1.204 linhas". */
  stats: string
  /** Trecho curto para o cartão e contexto do LLM. */
  excerpt: string
  title: string
  hasThumb: boolean
  /** Segundos (áudio/vídeo). */
  duration: number
}

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    file: FileShapeProps
  }
}

export type FileShape = TLShape<typeof FILE_SHAPE>
