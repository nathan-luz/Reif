/** Tipos de arquivo suportados, agrupados pelo visualizador que os renderiza. */
export const FILE_KINDS = [
  'pdf', 'doc', 'epub', 'slides', 'sheet', 'text', 'html', 'notebook', 'code', 'bib', 'audio', 'video',
] as const
export type FileKind = (typeof FILE_KINDS)[number]

const BY_EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  docx: 'doc', odt: 'doc', rtf: 'doc',
  epub: 'epub',
  pptx: 'slides', odp: 'slides',
  csv: 'sheet', tsv: 'sheet', xlsx: 'sheet', xls: 'sheet', ods: 'sheet', json: 'sheet',
  txt: 'text', md: 'text', markdown: 'text',
  html: 'html', htm: 'html',
  ipynb: 'notebook',
  py: 'code', js: 'code', ts: 'code', tsx: 'code', jsx: 'code', java: 'code', c: 'code', h: 'code', cpp: 'code',
  cs: 'code', go: 'code', rs: 'code', rb: 'code', php: 'code', sql: 'code', r: 'code', m: 'code', kt: 'code',
  swift: 'code', sh: 'code', yaml: 'code', yml: 'code', xml: 'code', css: 'code', tex: 'code', toml: 'code',
  bib: 'bib',
  mp3: 'audio', m4a: 'audio', wav: 'audio', ogg: 'audio', oga: 'audio', opus: 'audio', flac: 'audio', aac: 'audio', weba: 'audio',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video',
}

const BY_MIME: [RegExp, FileKind][] = [
  [/^application\/pdf$/, 'pdf'],
  [/wordprocessingml|opendocument\.text|^application\/rtf|^text\/rtf/, 'doc'],
  [/^application\/epub\+zip$/, 'epub'],
  [/presentationml|opendocument\.presentation/, 'slides'],
  [/spreadsheetml|opendocument\.spreadsheet|ms-excel|^text\/csv|^text\/tab-separated-values|^application\/json/, 'sheet'],
  [/^text\/markdown|^text\/plain/, 'text'],
  [/^text\/html|^application\/xhtml/, 'html'],
  [/^audio\//, 'audio'],
  [/^video\//, 'video'],
]

export const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''

/** Extensão primeiro (mais confiável que o MIME do SO); MIME como fallback. */
export function detectKind(name: string, mime = ''): FileKind | null {
  const ext = extensionOf(name)
  if (ext && BY_EXT[ext]) {
    // .webm pode ser só áudio (ex.: gravações do navegador)
    if (ext === 'webm' && mime.startsWith('audio/')) return 'audio'
    return BY_EXT[ext]
  }
  return BY_MIME.find(([re]) => re.test(mime))?.[1] ?? null
}

const MB = 1024 * 1024

/** Limites por tipo: acima disso o arquivo é recusado (mantém o app leve). */
export const MAX_SIZE: Record<FileKind, number> = {
  pdf: 80 * MB, doc: 40 * MB, epub: 60 * MB, slides: 80 * MB, sheet: 40 * MB, text: 10 * MB, html: 10 * MB,
  notebook: 30 * MB, code: 5 * MB, bib: 10 * MB, audio: 150 * MB, video: 300 * MB,
}

/** Arquivos da web até esse tamanho são copiados; acima, só o link (baixa ao abrir). */
export const WEB_COPY_LIMIT = 20 * MB

export const KIND_LABEL: Record<FileKind, string> = {
  pdf: 'PDF', doc: 'Documento', epub: 'EPUB', slides: 'Slides', sheet: 'Planilha', text: 'Texto', html: 'Página web',
  notebook: 'Notebook', code: 'Código', bib: 'Referências', audio: 'Áudio', video: 'Vídeo',
}

export const KIND_ICON: Record<FileKind, string> = {
  pdf: '📕', doc: '📄', epub: '📚', slides: '📊', sheet: '🧮', text: '📝', html: '🌐',
  notebook: '📓', code: '💻', bib: '🔖', audio: '🎧', video: '🎬',
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < MB) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / MB).toFixed(n < 10 * MB ? 1 : 0)} MB`
}

/** Tamanho do cartão no canvas por tipo. */
export const CARD_SIZE: Record<FileKind, { w: number; h: number }> = {
  pdf: { w: 240, h: 330 }, slides: { w: 320, h: 250 }, epub: { w: 240, h: 330 }, video: { w: 360, h: 250 },
  audio: { w: 380, h: 130 }, sheet: { w: 380, h: 240 },
  doc: { w: 300, h: 240 }, text: { w: 300, h: 240 }, html: { w: 320, h: 240 }, notebook: { w: 320, h: 240 },
  code: { w: 320, h: 240 }, bib: { w: 300, h: 240 },
}
