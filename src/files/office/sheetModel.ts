export type Cell = string | number | boolean | null

export interface SheetTable {
  name: string
  columns: string[]
  rows: Cell[][]
  totalRows: number
  truncated: boolean
}

export interface SheetModel {
  type: 'sheet'
  sheets: SheetTable[]
}

/** Linhas guardadas por aba (o leitor é virtualizado; acima disso, avisa que truncou). */
export const MAX_ROWS = 50_000

const colLetter = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : colLetter(Math.floor(i / 26) - 1) + colLetter(i % 26))

/** Matriz → tabela: 1ª linha vira cabeçalho se for toda texto; senão A, B, C… Pura. */
export function toTable(name: string, matrix: Cell[][]): SheetTable {
  const nonEmpty = matrix.filter((r) => r.some((c) => c !== null && c !== ''))
  const width = Math.max(0, ...nonEmpty.map((r) => r.length))
  const first = nonEmpty[0] ?? []
  const hasHeader = first.length > 0 && first.every((c) => typeof c === 'string' && c.trim() !== '')
  const columns = Array.from({ length: width }, (_, i) => (hasHeader ? String(first[i] ?? colLetter(i)) : colLetter(i)))
  const body = hasHeader ? nonEmpty.slice(1) : nonEmpty
  return {
    name,
    columns,
    rows: body.slice(0, MAX_ROWS).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? null)),
    totalRows: body.length,
    truncated: body.length > MAX_ROWS,
  }
}

/** JSON → tabela: array de objetos (colunas = união das chaves), array de arrays ou objeto. */
export function jsonToMatrix(value: unknown): Cell[][] {
  const cell = (v: unknown): Cell => (v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : (v as Cell))
  if (Array.isArray(value)) {
    if (value.every((v) => v && typeof v === 'object' && !Array.isArray(v))) {
      const keys = [...new Set(value.flatMap((o) => Object.keys(o as object)))]
      return [keys, ...value.map((o) => keys.map((k) => cell((o as Record<string, unknown>)[k])))]
    }
    return value.map((r) => (Array.isArray(r) ? r.map(cell) : [cell(r)]))
  }
  if (value && typeof value === 'object') return [['chave', 'valor'], ...Object.entries(value).map(([k, v]) => [k, cell(v)])]
  return [[cell(value)]]
}

/** Prévia do cartão: até 6 linhas × 4 colunas, separadas por tab. */
export function previewTsv(t: SheetTable): string {
  const cols = t.columns.slice(0, 4)
  const fmt = (c: Cell) => String(c ?? '').replace(/\s+/g, ' ').slice(0, 18)
  return [cols.map(fmt), ...t.rows.slice(0, 5).map((r) => r.slice(0, 4).map(fmt))].map((r) => r.join('\t')).join('\n')
}

/** Texto para a IA: CSV das primeiras linhas de cada aba. */
export function sheetToText(model: SheetModel, maxChars: number): string {
  let out = ''
  for (const t of model.sheets) {
    out += `## Aba: ${t.name} (${t.totalRows} linhas)\n${t.columns.join(',')}\n`
    for (const r of t.rows) {
      if (out.length > maxChars) return out.slice(0, maxChars)
      out += r.map((c) => (typeof c === 'string' && /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : String(c ?? ''))).join(',') + '\n'
    }
  }
  return out
}

/** Bytes → texto: UTF-8 (com/sem BOM) ou, se inválido, Windows-1252 (CSV do Excel BR). */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Separador mais provável pela 1ª linha (fora de aspas): ',', ';' ou tab. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const line = (text.split(/\r?\n/, 1)[0] ?? '').replace(/"[^"]*"/g, '')
  const count = (d: string) => line.split(d).length - 1
  const ranked = ([',', ';', '\t'] as const).map((d) => [d, count(d)] as const).sort((a, b) => b[1] - a[1])
  return ranked[0]![1] > 0 ? ranked[0]![0] : ','
}
