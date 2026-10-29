import { citation, parseBib } from '../office/bib'
import { MAX_TEXT, plural, type Analyzer } from './types'

export interface BibModel {
  type: 'bib'
  entries: ReturnType<typeof parseBib>
}

export const analyzeBib: Analyzer = async (file) => {
  const entries = parseBib(await file.text())
  const cites = entries.map(citation)
  const model: BibModel = { type: 'bib', entries }
  return {
    stats: plural(entries.length, 'referência', 'referências'),
    excerpt: cites.slice(0, 4).join('\n\n'),
    text: cites.join('\n').slice(0, MAX_TEXT),
    model,
  }
}
