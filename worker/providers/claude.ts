import { fetchWithRetry, ProviderError, type GenerateRequest, type LLMProvider } from './types'

interface ClaudeResponse {
  content?: { type: string; text?: string }[]
  stop_reason?: string
}

/** Structured outputs nativo (output_config.format = json_schema). */
export function createClaude(apiKey: string, model: string): LLMProvider {
  return {
    name: 'claude',
    async generate({ system, user, schema }: GenerateRequest) {
      const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system,
          messages: [{ role: 'user', content: user }],
          output_config: { format: { type: 'json_schema', schema } },
        }),
      })
      if (!res.ok) throw new ProviderError('claude', res.status, await res.text())
      const data = (await res.json()) as ClaudeResponse
      const text = data.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
      if (!text) throw new ProviderError('claude', 502, `resposta vazia (${data.stop_reason ?? '?'})`)
      return JSON.parse(text) as unknown
    },
  }
}
