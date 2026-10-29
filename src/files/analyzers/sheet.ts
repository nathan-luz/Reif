import { previewTsv, sheetToText, type SheetModel } from '../office/sheetModel'
import { runInWorker } from '../worker/client'
import { MAX_TEXT, plural, type Analyzer } from './types'

export const analyzeSheet: Analyzer = async (file, name) => {
  const model = await runInWorker<SheetModel>('sheet', await file.arrayBuffer(), name)
  const first = model.sheets[0]
  const rows = model.sheets.reduce((n, s) => n + s.totalRows, 0)
  const stats =
    model.sheets.length > 1
      ? `${plural(model.sheets.length, 'aba', 'abas')} · ${plural(rows, 'linha', 'linhas')}`
      : `${plural(rows, 'linha', 'linhas')} × ${plural(first?.columns.length ?? 0, 'coluna', 'colunas')}`
  return { stats, excerpt: first ? previewTsv(first) : '', text: sheetToText(model, MAX_TEXT), model }
}
