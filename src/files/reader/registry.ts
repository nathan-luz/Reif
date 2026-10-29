import { lazy, type ComponentType } from 'react'
import type { FileKind } from '../kinds'
import type { ReaderProps } from './types'

/** Leitores carregados sob demanda: a lib de cada formato só baixa quando usada. */
export const READERS: Partial<Record<FileKind, ComponentType<ReaderProps>>> = {
  pdf: lazy(() => import('./PdfReader')),
  text: lazy(() => import('./TextReader')),
  doc: lazy(() => import('./DocReader')),
  epub: lazy(() => import('./DocReader')),
  slides: lazy(() => import('./SlidesReader')),
  sheet: lazy(() => import('./SheetReader')),
}
