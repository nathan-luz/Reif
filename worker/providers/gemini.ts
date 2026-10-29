import { fetchWithRetry, ProviderError, type GenerateRequest, type JsonSchema, type LLMProvider } from './types'

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
}

/** Gemini aceita um subconjunto de JSON Schema: remove chaves que ele rejeita. */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema)
  if (!node || typeof node !== 'object') return node
  return Object.fromEntries(
    Object.entries(node)
      .filter(([k]) => k !== '$schema' && k !== 'additionalProperties')
      .map(([k, v]) => [k, toGeminiSchema(v)]),
  )
}

export function createGemini(apiKey: string, model: string): LLMProvider {
  return {
    name: 'gemini',
    async generate({ system, user, schema }: GenerateRequest) {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseJsonSchema: toGeminiSchema(schema) as JsonSchema,
            },
          }),
        },
      )
      if (!res.ok) throw new ProviderError('gemini', res.status, await res.text())
      const data = (await res.json()) as GeminiResponse
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
      if (!text) throw new ProviderError('gemini', 502, `resposta vazia (${data.candidates?.[0]?.finishReason ?? '?'})`)
      return JSON.parse(text) as unknown
    },
  }
}
