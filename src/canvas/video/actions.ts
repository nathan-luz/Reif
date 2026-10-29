import { atom, type Editor, type JsonObject, type TLShapeId } from 'tldraw'
import { currentDesignSystem } from '../../design-system/state'
import type { YouTubeShape } from '../../shapes/youtube/types'
import {
  SummarySchema,
  TranscriptSchema,
  formatTime,
  transcriptToText,
  type Summary,
  type Transcript,
  type VideoRequest,
} from '../../shared/video'
import { renderCards, type Card } from './layout'
import { cardText, timestampedText } from './richText'

export type VideoJob = { kind: 'transcript' | 'summary'; status: 'running' } | { kind: 'transcript' | 'summary'; status: 'error'; message: string }

/** Jobs por shape de vídeo (sobrevive a desmontar/remontar o componente). */
export const videoJobs = atom<Record<string, VideoJob | undefined>>('reif:video-jobs', {})

const setJob = (id: TLShapeId, job: VideoJob | undefined) => videoJobs.update((jobs) => ({ ...jobs, [id]: job }))

async function post<T>(path: string, body: VideoRequest, parse: (v: unknown) => T): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? `HTTP ${res.status}`)
  return parse(data)
}

interface TranscriptMeta {
  reifVideo?: { videoId: string; kind: 'transcript'; text: string }
}

/** Reaproveita uma transcrição já gerada para este vídeo (resumo mais barato e rápido). */
function existingTranscript(editor: Editor, videoId: string): string | undefined {
  for (const s of editor.getCurrentPageShapes()) {
    const m = (s.meta as TranscriptMeta).reifVideo
    if (m?.kind === 'transcript' && m.videoId === videoId) return m.text
  }
  return undefined
}

/** Transcrição ao lado da origem (vídeo do YouTube, áudio ou vídeo local). */
export function renderTranscript(editor: Editor, sourceId: TLShapeId, label: string, t: Transcript, frameMeta?: JsonObject) {
  const header: Card[] = [
    { role: 'body', richText: timestampedText(t.segments.map((s) => ({ time: formatTime(s.t), text: s.text }))) },
  ]
  renderCards(editor, currentDesignSystem(), {
    sourceId,
    frameName: `Transcrição · ${label}`,
    title: label,
    header,
    cards: [],
    columns: 1,
    columnWidth: 640,
    ...(frameMeta ? { frameMeta } : {}),
  })
}

/** Enhanced summary. `media`: seções com timestamp (m:ss); documentos usam página/seção. */
export function renderSummary(editor: Editor, sourceId: TLShapeId, label: string, s: Summary, media: boolean) {
  const prefix = (start: number) => (media ? `[${formatTime(start)}] ` : start > 0 ? `[p. ${start}] ` : '')
  const cards: Card[] = s.sections.map((sec, i) => ({
    role: i % 2 === 0 ? 'primary' : 'secondary',
    richText: cardText({ heading: `${prefix(sec.start)}${sec.heading}`, bullets: sec.points }),
  }))
  cards.push({ role: 'accent', richText: cardText({ heading: 'Principais conclusões', bullets: s.takeaways }) })
  renderCards(editor, currentDesignSystem(), {
    sourceId,
    frameName: `Resumo · ${label || s.title}`,
    title: s.title,
    header: [{ role: 'highlight', richText: cardText({ heading: 'TL;DR', body: s.tldr }) }],
    cards,
    columns: 2,
    columnWidth: 380,
  })
}

export async function runVideoAction(editor: Editor, video: YouTubeShape, kind: 'transcript' | 'summary') {
  if (videoJobs.get()[video.id]?.status === 'running') return
  setJob(video.id, { kind, status: 'running' })
  const base: VideoRequest = { videoId: video.props.videoId, ...(video.props.title ? { title: video.props.title } : {}) }
  try {
    if (kind === 'transcript') {
      const t = await post('/api/youtube/transcript', base, (v) => TranscriptSchema.parse(v))
      const current = editor.getShape<YouTubeShape>(video.id) ?? video
      const label = current.props.title || 'vídeo'
      renderTranscript(editor, current.id, label, t, {
        reifVideo: { videoId: video.props.videoId, kind: 'transcript', text: transcriptToText(t) },
      })
    } else {
      const transcript = existingTranscript(editor, video.props.videoId)
      const s = await post('/api/youtube/summary', { ...base, ...(transcript ? { transcript } : {}) }, (v) =>
        SummarySchema.parse(v),
      )
      const current = editor.getShape<YouTubeShape>(video.id) ?? video
      renderSummary(editor, current.id, current.props.title, s, true)
    }
    setJob(video.id, undefined)
  } catch (err) {
    setJob(video.id, { kind, status: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
