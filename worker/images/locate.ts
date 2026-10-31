import { z } from 'zod'

/**
 * "Apontar" partes numa ilustração: o Gemini (visão) devolve onde cada rótulo fica na
 * imagem (0..1), para as linhas-guia da ilustração rotulada terminarem na parte certa.
 */

export const LocateRequestSchema = z.object({
  image: z.string().startsWith('data:image/').max(2_500_000),
  labels: z.array(z.string().trim().min(1).max(120)).min(1).max(24),
  subject: z.string().max(300).optional(),
})

const ResultSchema = z.object({
  points: z.array(z.object({ label: z.string(), x: z.number(), y: z.number(), found: z.boolean() })),
})

const SCHEMA = {
  type: 'object',
  properties: {
    points: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          y: { type: 'number', description: 'vertical position, 0 = top edge, 1000 = bottom edge' },
          x: { type: 'number', description: 'horizontal position, 0 = left edge, 1000 = right edge' },
          found: { type: 'boolean', description: 'false if the part is not visible in the image' },
        },
        required: ['label', 'y', 'x', 'found'],
      },
    },
  },
  required: ['points'],
}

export async function locateParts(apiKey: string | undefined, model: string, req: z.infer<typeof LocateRequestSchema>) {
  if (!apiKey) return { error: 'GEMINI_API_KEY não configurada', status: 501 as const }
  const [, mime = 'image/jpeg', data = ''] = /^data:([^;]+);base64,(.*)$/.exec(req.image) ?? []
  const prompt =
    `The image is an educational illustration${req.subject ? ` of: ${req.subject}` : ''}. ` +
    `For each label below, give the point INSIDE the image (y and x normalized to 0-1000) where a leader line should touch that part. ` +
    `Pick the visual center of the part. If a part is not visible, set found=false and point to the closest region.\nLabels:\n` +
    req.labels.map((l) => `- ${l}`).join('\n')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data } }, { text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseJsonSchema: SCHEMA, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) return { error: `gemini ${res.status}`, status: 502 as const }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  const parsed = ResultSchema.safeParse(JSON.parse(text || '{}'))
  if (!parsed.success) return { error: 'resposta inválida', status: 502 as const }
  return { points: parsed.data.points.map((p) => ({ ...p, ...normalizePoint(p, parsed.data.points) })) }
}

/**
 * O Gemini aponta em 0–1000 (seu formato nativo); por segurança aceita 0–1 também, decidindo
 * pela escala do conjunto (um ponto 0–1000 perto da borda não pode virar 0–1 sozinho).
 */
export function normalizePoint(p: { x: number; y: number }, all: { x: number; y: number }[]) {
  const scale = all.some((q) => q.x > 1.5 || q.y > 1.5) ? 1000 : 1
  const clamp = (n: number) => Math.min(0.98, Math.max(0.02, n / scale))
  return { x: clamp(p.x), y: clamp(p.y) }
}
