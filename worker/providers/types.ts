export type JsonSchema = Record<string, unknown>

export interface GenerateRequest {
  system: string
  user: string
  schema: JsonSchema
}

/** Strategy: cada provedor devolve o JSON bruto; a validação é feita fora. */
export interface LLMProvider {
  readonly name: string
  generate(req: GenerateRequest): Promise<unknown>
}

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number,
    detail: string,
  ) {
    super(`${provider} ${status}: ${detail.slice(0, 500)}`)
  }
}

const RETRYABLE = new Set([429, 500, 503, 529])

/** fetch com backoff exponencial para sobrecarga transitória do provedor. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
  timeoutMs = 120_000,
): Promise<Response> {
  const provider = new URL(url).hostname.split('.').slice(-2, -1)[0] ?? 'llm'
  // Timeout/rede viram ProviderError (o usuário vê a causa em vez de um 500 genérico).
  const call = () =>
    fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }).catch((e: unknown) => {
      const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
      throw new ProviderError(provider, timeout ? 504 : 502, timeout ? `sem resposta em ${timeoutMs / 1000}s` : String(e))
    })
  let res = await call()
  for (let i = 1; i < attempts && RETRYABLE.has(res.status); i++) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
    res = await call()
  }
  return res
}
