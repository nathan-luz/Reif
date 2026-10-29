import type { FileShape } from '../../shapes/file/types'

export interface ReaderProps {
  shape: FileShape
  blob: Blob
  /** Largura útil do painel (px). */
  width: number
}
