import { formatBytes, KIND_LABEL, type FileKind } from '../kinds'
import type { Analyzer } from './types'

const generic: Analyzer = async (file) => ({ stats: formatBytes(file.size), excerpt: '' })

/** Cada analisador (e suas libs) só é baixado quando aquele tipo aparece. */
export async function loadAnalyzer(kind: FileKind): Promise<Analyzer> {
  switch (kind) {
    case 'pdf':
      return (await import('./pdf')).analyzePdf
    case 'audio':
      return (await import('./audio')).analyzeAudio
    case 'text':
      return (await import('./text')).analyzeText
    case 'doc':
      return (await import('./doc')).analyzeDoc
    case 'epub':
      return (await import('./epub')).analyzeEpub
    case 'slides':
      return (await import('./slides')).analyzeSlides
    case 'sheet':
      return (await import('./sheet')).analyzeSheet
    default:
      return async (file, name) => ({ ...(await generic(file, name)), stats: KIND_LABEL[kind] })
  }
}
