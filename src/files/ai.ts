import { atom, type Editor, type TLShapeId } from 'tldraw'
import { renderSummary, renderTranscript } from '../canvas/video/actions'
import { FILE_SHAPE, type FileShape } from '../shapes/file/types'
import { SummarySchema, TranscriptSchema, transcriptToText, type Summary, type Transcript } from '../shared/video'
import { derivedKey, getFileBlob } from './blob'
import type { FileKind } from './kinds'
import { getDerived, putDerived } from './store'

export type FileAction = 'transcript' | 'summary'
export type FileJob = { action: FileAction; status: 'running' } | { action: FileAction; status: 'error'; message: string }

/** Jobs de IA por cartão (sobrevivem a desmontar/remontar o componente). */
export const fileJobs = atom<Record<string, FileJob | undefined>>('reif:file-jobs', {})
const setJob = (id: TLShapeId, job: FileJob | undefined) => fileJobs.update((j) => ({ ...j, [id]: job }))

const MEDIA = new Set<FileKind>(['audio', 'video'])
/** Enviados como arquivo ao Gemini (lê áudio, vídeo e PDF — inclusive PDF escaneado). */
const SEND_FILE = new Set<FileKind>(['audio', 'video', 'pdf'])

export const actionsFor = (kind: FileKind): FileAction[] => (MEDIA.has(kind) ? ['transcript', 'summary'] : ['summary'])

/** Texto completo para a IA (PDF extraído sob demanda; mídia = transcrição, se houver). */
export async function fullText(shape: FileShape, maxChars = 120_000): Promise<string> {
  const key = derivedKey(shape)
  if (shape.props.kind === 'pdf') {
    const cached = await getDerived<string>(key, 'fulltext')
    if (cached !== undefined) return cached.slice(0, maxChars)
    const { openPdf, pdfText } = await import('./pdfjs')
    const doc = await openPdf(await getFileBlob(shape))
    try {
      const text = await pdfText(doc, 400, 400_000)
      await putDerived(key, 'fulltext', text)
      return text.slice(0, maxChars)
    } finally {
      void doc.loadingTask.destroy()
    }
  }
  return ((await getDerived<string>(key, 'text')) ?? '').slice(0, maxChars)
}

async function postJson<T>(url: string, init: RequestInit, parse: (v: unknown) => T): Promise<T> {
  const res = await fetch(url, init)
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `HTTP ${res.status}`)
  return parse(data)
}

async function sendFile<T>(shape: FileShape, mode: FileAction, parse: (v: unknown) => T): Promise<T> {
  const blob = await getFileBlob(shape)
  const q = new URLSearchParams({ name: shape.props.name, ...(shape.props.title ? { title: shape.props.title } : {}) })
  return postJson(`/api/files/ai/${mode}?${q}`, { method: 'POST', headers: { 'content-type': blob.type || shape.props.mime || 'application/octet-stream' }, body: blob }, parse)
}

export async function runFileAction(editor: Editor, shape: FileShape, action: FileAction) {
  if (fileJobs.get()[shape.id]?.status === 'running') return
  setJob(shape.id, { action, status: 'running' })
  const label = shape.props.title || shape.props.name
  const media = MEDIA.has(shape.props.kind)
  try {
    if (action === 'transcript') {
      const t: Transcript = await sendFile(shape, 'transcript', (v) => TranscriptSchema.parse(v))
      // a transcrição vira o texto do arquivo: resumos e perguntas passam a usá-la
      await putDerived(derivedKey(shape), 'text', transcriptToText(t))
      renderTranscript(editor, shape.id, label, t)
    } else {
      const text = media || !SEND_FILE.has(shape.props.kind) ? await fullText(shape, 400_000) : ''
      const s: Summary =
        text.trim() && shape.props.kind !== 'pdf'
          ? await postJson('/api/files/ai-text/summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, title: label }) }, (v) => SummarySchema.parse(v))
          : SEND_FILE.has(shape.props.kind)
            ? await sendFile(shape, 'summary', (v) => SummarySchema.parse(v))
            : (() => {
                throw new Error('Este arquivo não tem texto para resumir')
              })()
      renderSummary(editor, shape.id, label, s, media)
    }
    setJob(shape.id, undefined)
  } catch (err) {
    setJob(shape.id, { action, status: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

/** Anexos para a barra de prompt: texto completo dos arquivos selecionados (limitado). */
export async function attachmentsFor(editor: Editor, ids: TLShapeId[], budget = 300_000) {
  const out: { id: string; name: string; kind: string; text: string }[] = []
  for (const id of ids) {
    const shape = editor.getShape<FileShape>(id)
    if (shape?.type !== FILE_SHAPE || budget <= 0) continue
    const text = await fullText(shape, Math.min(120_000, budget)).catch(() => '')
    if (!text.trim()) continue
    budget -= text.length
    out.push({ id: shape.id, name: shape.props.title || shape.props.name, kind: shape.props.kind, text })
  }
  return out
}
