import { SummarySchema, TranscriptSchema, type Summary, type Transcript } from '../src/shared/video'
import { fetchWithRetry, ProviderError } from './providers/types'
import { generate, summaryPrompt, transcriptPrompt, type Subject } from './video'

const API = 'https://generativelanguage.googleapis.com'

interface GeminiFile {
  name: string
  uri: string
  mimeType: string
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED'
}

/**
 * Envia o arquivo à Files API do Gemini em streaming (sem carregar tudo na memória do Worker).
 * Upload resumível: start → upload+finalize → aguarda ficar ACTIVE (áudio/vídeo são processados).
 */
export async function uploadToGemini(apiKey: string, body: ReadableStream, size: number, mime: string, name: string): Promise<GeminiFile> {
  const start = await fetchWithRetry(
    `${API}/upload/v1beta/files`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(size),
        'X-Goog-Upload-Header-Content-Type': mime,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: name.slice(0, 120) } }),
    },
    2,
    30_000,
  )
  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!start.ok || !uploadUrl) throw new ProviderError('gemini-files', start.status, await start.text())

  const up = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Length': String(size), 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body,
    signal: AbortSignal.timeout(300_000),
  })
  if (!up.ok) throw new ProviderError('gemini-files', up.status, await up.text())
  let file = ((await up.json()) as { file: GeminiFile }).file

  for (let i = 0; i < 90 && file.state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(`${API}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': apiKey } })
    if (res.ok) file = (await res.json()) as GeminiFile
  }
  if (file.state === 'FAILED') throw new ProviderError('gemini-files', 422, 'o Gemini não conseguiu processar o arquivo')
  if (file.state === 'PROCESSING') throw new ProviderError('gemini-files', 504, 'processamento demorou demais')
  return file
}

const filePart = (f: GeminiFile) => ({ file_data: { mime_type: f.mimeType, file_uri: f.uri } })

export function transcribeFile(apiKey: string, file: GeminiFile, subject: Subject): Promise<Transcript> {
  return generate(apiKey, [filePart(file), { text: transcriptPrompt(subject) }], TranscriptSchema)
}

export function summarizeFile(apiKey: string, file: GeminiFile, subject: Subject, title?: string): Promise<Summary> {
  return generate(apiKey, [filePart(file), { text: `${summaryPrompt(subject)}\n\n${title ? `Title: ${title}` : ''}` }], SummarySchema)
}

/** Documentos não-PDF: o texto já foi extraído no navegador. */
export function summarizeText(apiKey: string, text: string, subject: Subject, title?: string): Promise<Summary> {
  return generate(apiKey, [{ text: `${summaryPrompt(subject)}\n\n${title ? `Title: ${title}\n` : ''}Content:\n${text}` }], SummarySchema)
}
