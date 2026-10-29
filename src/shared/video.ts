import { z } from 'zod'

export const TranscriptSchema = z.object({
  language: z.string().describe('BCP-47 do idioma falado, ex: "pt-BR", "en"'),
  segments: z
    .array(
      z.object({
        t: z.number().describe('Início do trecho em segundos'),
        text: z.string(),
      }),
    )
    .describe('Trechos de ~20-40s, cada um começando numa fronteira de frase'),
})
export type Transcript = z.infer<typeof TranscriptSchema>

export const SummarySchema = z.object({
  title: z.string().describe('Título curto e informativo'),
  tldr: z.string().describe('2-3 frases com a essência do vídeo'),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        start: z.number().describe('Segundo em que o assunto começa no vídeo'),
        points: z.array(z.string()).describe('2-6 tópicos objetivos'),
      }),
    )
    .describe('3-8 seções na ordem do vídeo'),
  takeaways: z.array(z.string()).describe('3-6 conclusões principais'),
})
export type Summary = z.infer<typeof SummarySchema>

export const VideoRequestSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().max(300).optional(),
  /** Para o resumo: transcrição já existente (mais barato que reprocessar o vídeo). */
  transcript: z.string().max(400_000).optional(),
})
export type VideoRequest = z.infer<typeof VideoRequestSchema>

export const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Texto "[m:ss] ..." por trecho — usado no canvas e reaproveitado no resumo. */
export const transcriptToText = (t: Transcript) => t.segments.map((s) => `[${formatTime(s.t)}] ${s.text}`).join('\n')
