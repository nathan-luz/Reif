import { z } from 'zod'
import { SummarySchema, TranscriptSchema, type Summary, type Transcript, type VideoRequest } from '../src/shared/video'
import { fetchWithRetry, ProviderError, type JsonSchema } from './providers/types'

/** Modelos tentados em sequência (alguns ficam instáveis/indisponíveis de tempos em tempos). */
const VIDEO_MODELS = ['gemini-3.5-flash', 'gemini-flash-latest'] as const
/** Vídeos longos levam minutos para processar. */
const TIMEOUT_MS = 240_000

const stripSchema = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(stripSchema)
  if (!node || typeof node !== 'object') return node
  return Object.fromEntries(
    Object.entries(node)
      .filter(([k]) => k !== '$schema' && k !== 'additionalProperties')
      .map(([k, v]) => [k, stripSchema(v)]),
  )
}

export type Subject = 'video' | 'audio' | 'document'

export const transcriptPrompt = (subject: Subject) => `Transcribe ALL speech in this ${subject} verbatim, in the original spoken language.
Split into segments of roughly 20-40 seconds, each starting at a sentence boundary; "t" is the start time in seconds.
Skip music-only or silent parts. Do not summarize or translate.`

export const summaryPrompt = (subject: Subject) => `You are an expert note-taker. Write an "enhanced summary" of the ${subject} in Brazilian Portuguese:
rewrite the content into a well-organized study note — a short informative title, a 2-3 sentence TL;DR,
3-8 sections in the order they appear (each with a heading, ${
  subject === 'document' ? 'the page or section number where it starts (use 0 if unknown) as "start"' : 'the start second'
}, and 2-6 crisp bullet points capturing key ideas, definitions, numbers and examples), and 3-6 key takeaways.
Remove filler, repetition, greetings and sponsor segments. Never invent facts that are not in the ${subject}.`

const TRANSCRIPT_PROMPT = transcriptPrompt('video')
const SUMMARY_PROMPT = summaryPrompt('video')

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
}

export async function generate<T>(
  apiKey: string,
  parts: unknown[],
  schema: z.ZodType<T>,
): Promise<T> {
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema: stripSchema(z.toJSONSchema(schema)) as JsonSchema,
      mediaResolution: 'MEDIA_RESOLUTION_LOW',
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  let lastError: unknown
  for (const model of VIDEO_MODELS) {
    try {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body },
        2,
        TIMEOUT_MS,
      )
      if (!res.ok) throw new ProviderError(model, res.status, await res.text())
      const data = (await res.json()) as GeminiResponse
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
      if (!text) throw new ProviderError(model, 502, `resposta vazia (${data.candidates?.[0]?.finishReason ?? '?'})`)
      return schema.parse(JSON.parse(text))
    } catch (err) {
      lastError = err
      // 4xx (exceto 429) é erro do pedido: não adianta trocar de modelo.
      if (err instanceof ProviderError && err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 404) throw err
    }
  }
  throw lastError
}

const videoPart = (videoId: string) => ({ file_data: { file_uri: `https://www.youtube.com/watch?v=${videoId}` } })

export function transcribeVideo(apiKey: string, req: VideoRequest): Promise<Transcript> {
  return generate(apiKey, [videoPart(req.videoId), { text: TRANSCRIPT_PROMPT }], TranscriptSchema)
}

export function summarizeVideo(apiKey: string, req: VideoRequest): Promise<Summary> {
  const context = req.title ? `Video title: ${req.title}\n` : ''
  const parts = req.transcript
    ? [{ text: `${SUMMARY_PROMPT}\n\n${context}Timestamped transcript:\n${req.transcript}` }]
    : [videoPart(req.videoId), { text: `${SUMMARY_PROMPT}\n\n${context}` }]
  return generate(apiKey, parts, SummarySchema)
}
