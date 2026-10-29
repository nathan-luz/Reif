import * as XLSX from 'xlsx'
import { decodeText, detectDelimiter, jsonToMatrix, toTable, type Cell, type SheetModel } from '../office/sheetModel'

/** Roda no worker: SheetJS lê CSV/TSV/XLSX/XLS/ODS; JSON é tratado à parte. */
export function parseSheet(buffer: ArrayBuffer, name: string): SheetModel {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  const bytes = new Uint8Array(buffer)
  if (ext === 'json') {
    const value: unknown = JSON.parse(decodeText(bytes))
    return { type: 'sheet', sheets: [toTable('JSON', jsonToMatrix(value))] }
  }
  // Texto delimitado: decodifica antes (o SheetJS leria os bytes como latin1) e detecta o separador.
  const wb =
    ext === 'csv' || ext === 'tsv'
      ? (() => {
          const text = decodeText(bytes).replace(/^\uFEFF/, '')
          return XLSX.read(text, { type: 'string', dense: true, FS: ext === 'tsv' ? '\t' : detectDelimiter(text) })
        })()
      : XLSX.read(bytes, { type: 'array', dense: true, cellDates: true })
  return {
    type: 'sheet',
    sheets: wb.SheetNames.map((sheetName) => {
      const ws = wb.Sheets[sheetName]!
      const matrix = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: false, defval: null, blankrows: false })
      return toTable(sheetName, matrix)
    }),
  }
}
