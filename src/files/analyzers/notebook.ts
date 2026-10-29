import { headLines } from '../office/codeLang'
import { parseNotebook } from '../office/notebook'
import { MAX_TEXT, plural, type Analyzer } from './types'

export const analyzeNotebook: Analyzer = async (file) => {
  const model = parseNotebook(JSON.parse(await file.text()))
  const text = model.cells.map((c) => (c.type === 'code' ? `\`\`\`${model.language}\n${c.source}\n\`\`\`` : c.source)).join('\n\n').slice(0, MAX_TEXT)
  const title = model.cells.find((c) => c.type === 'markdown')?.source.match(/^#\s+(.+)$/m)?.[1]?.trim()
  const codeCells = model.cells.filter((c) => c.type === 'code').length
  return {
    stats: `${plural(model.cells.length, 'célula', 'células')} · ${plural(codeCells, 'de código', 'de código')}`,
    excerpt: headLines(model.cells.map((c) => c.source).join('\n')),
    text,
    model,
    ...(title ? { title } : {}),
  }
}
