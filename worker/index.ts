import { Hono } from 'hono'
import { z } from 'zod'
import { isVideoId } from '../src/shapes/youtube/youtube-url'
import {
  LLMPlanSchema,
  sanitizePlan,
  stripEmptyOptionals,
  TransformRequestSchema,
  type Provider,
} from '../src/shared/mutations'
import { buildSystemPrompt, buildUserMessage } from './prompt'
import { createClaude } from './providers/claude'
import { createGemini } from './providers/gemini'
import { ProviderError, type JsonSchema, type LLMProvider } from './providers/types'
import { proxyImage, trackUnsplashDownload } from './images/proxy'
import { searchImages } from './images/search'
import { ImageSourceSchema } from '../src/shared/images'
import { resolvePlan } from './resolvers'
import { summarizeVideo, transcribeVideo } from './video'
import { VideoRequestSchema } from '../src/shared/video'
import { fetchVideoTitle } from './resolvers/youtube'

type Env = {
  GEMINI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_MODEL?: string
  CLAUDE_MODEL?: string
  YOUTUBE_API_KEY?: string
  UNSPLASH_ACCESS_KEY?: string
  PIXABAY_API_KEY?: string
  PEXELS_API_KEY?: string
}

const PLAN_JSON_SCHEMA = z.toJSONSchema(LLMPlanSchema) as JsonSchema

function getProvider(env: Env, provider: Provider): LLMProvider | null {
  switch (provider) {
    case 'gemini':
      return env.GEMINI_API_KEY ? createGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL ?? 'gemini-3.5-flash') : null
    case 'claude':
      return env.ANTHROPIC_API_KEY
        ? createClaude(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL ?? 'claude-sonnet-5-5')
        : null
  }
}

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/transform', async (c) => {
  const parsed = TransformRequestSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'payload inválido', issues: parsed.error.issues }, 400)

  const req = parsed.data
  const provider = getProvider(c.env, req.provider)
  if (!provider) return c.json({ error: `API key de ${req.provider} não configurada` }, 500)

  try {
    const raw = await provider.generate({
      system: buildSystemPrompt(req.designSystem),
      user: buildUserMessage(req),
      schema: PLAN_JSON_SCHEMA,
    })
    const plan = LLMPlanSchema.safeParse(stripEmptyOptionals(raw))
    if (!plan.success) return c.json({ error: 'resposta do LLM fora do schema', issues: plan.error.issues }, 502)
    return c.json(await resolvePlan(sanitizePlan(plan.data, req.subgraph), c.env))
  } catch (err) {
    if (err instanceof ProviderError) {
      console.error(err.message)
      return c.json({ error: err.message }, 502)
    }
    throw err
  }
})

app.get('/api/youtube/meta/:id', async (c) => {
  const id = c.req.param('id')
  if (!isVideoId(id)) return c.json({ error: 'id inválido' }, 400)
  const title = await fetchVideoTitle(id).catch(() => null)
  if (!title) return c.json({ error: 'não encontrado' }, 404)
  c.header('cache-control', 'public, max-age=86400')
  return c.json({ title })
})

app.get('/api/images/search', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json({ error: 'q obrigatório' }, 400)
  const source = ImageSourceSchema.safeParse(c.req.query('source'))
  c.header('cache-control', 'private, max-age=300')
  return c.json(await searchImages(q.slice(0, 200), c.env, source.success ? source.data : undefined))
})

app.get('/api/images/proxy', (c) => proxyImage(c.req.query('url') ?? ''))

app.post('/api/images/unsplash/track', async (c) => {
  const body = await c.req.json<{ downloadLocation?: string }>().catch(() => ({}) as { downloadLocation?: string })
  if (body.downloadLocation && c.env.UNSPLASH_ACCESS_KEY) {
    c.executionCtx.waitUntil(trackUnsplashDownload(body.downloadLocation, c.env.UNSPLASH_ACCESS_KEY).catch(() => {}))
  }
  return c.body(null, 204)
})

app.post('/api/youtube/:action{transcript|summary}', async (c) => {
  const parsed = VideoRequestSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'payload inválido', issues: parsed.error.issues }, 400)
  if (!c.env.GEMINI_API_KEY) return c.json({ error: 'GEMINI_API_KEY não configurada' }, 500)
  try {
    const result =
      c.req.param('action') === 'transcript'
        ? await transcribeVideo(c.env.GEMINI_API_KEY, parsed.data)
        : await summarizeVideo(c.env.GEMINI_API_KEY, parsed.data)
    return c.json(result)
  } catch (err) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg.slice(0, 500) }, 502)
  }
})

export default app
