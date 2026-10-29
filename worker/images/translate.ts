const cache = new Map<string, string>()
/** Corridos em paralelo: o primeiro que responder vence (modelos às vezes travam). */
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'] as const
const TIMEOUT_MS = 5_000

const PT_HINT = /[ãõçáéíóúâêôà]|\b(de|da|do|das|dos|com|sem|em|no|na|para|uma?|e|tomando|fazendo|sobre)\b/i

/** Heurística local (sem LLM): parece português? */
export const looksPortuguese = (q: string) => PT_HINT.test(q)

async function translateWith(model: string, query: string, apiKey: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'Translate the image search query to concise English keywords. Reply with the query only.' }],
      },
      contents: [{ role: 'user', parts: [{ text: query }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 256, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) throw new Error(`${model} ${res.status}`)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^["']|["']$/g, '')
  if (!out || out.length > 200) throw new Error(`${model}: resposta vazia`)
  return out
}

/** Traduz para inglês (Wikimedia/Openverse indexam em inglês). Fallback: original. */
export async function toEnglishQuery(query: string, apiKey: string | undefined): Promise<string> {
  if (!apiKey || !looksPortuguese(query)) return query
  const key = query.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached
  try {
    const english = await Promise.any(MODELS.map((m) => translateWith(m, query, apiKey)))
    if (cache.size > 500) cache.clear()
    cache.set(key, english)
    return english
  } catch {
    return query
  }
}
