const cache = new Map<string, string>()
const MODEL = 'gemini-3.5-flash-lite'

/** Traduz a busca para inglês (Wikimedia/Openverse indexam em inglês). Fallback: original. */
export async function toEnglishQuery(query: string, apiKey: string | undefined): Promise<string> {
  const key = query.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit
  if (!apiKey || /^[\x20-\x7e]*$/.test(query) && /\b(the|of|and|with|in|on)\b/i.test(query)) return query
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(4_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'Translate the image search query to concise English keywords. Reply with the query only. If it is already English, repeat it.' }],
        },
        contents: [{ role: 'user', parts: [{ text: query }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 40 },
      }),
    })
    if (!res.ok) return query
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const out = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^"|"$/g, '')
    const english = out && out.length < 200 ? out : query
    if (cache.size > 500) cache.clear()
    cache.set(key, english)
    return english
  } catch {
    return query
  }
}
