import { Hono } from 'hono'
import { z } from 'zod'
import {
  MutationPlanSchema,
  sanitizePlan,
  TransformRequestSchema,
  type Provider,
} from '../src/shared/mutations'
import { buildUserMessage, SYSTEM_PROMPT } from './prompt'
import { createClaude } from './providers/claude'
import { createGemini } from './providers/gemini'
import { ProviderError, type JsonSchema, type LLMProvider } from './providers/types'

type Env = {
  GEMINI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  GEMINI_MODEL?: string
  CLAUDE_MODEL?: string
}

const PLAN_JSON_SCHEMA = z.toJSONSchema(MutationPlanSchema) as JsonSchema

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
      system: SYSTEM_PROMPT,
      user: buildUserMessage(req),
      schema: PLAN_JSON_SCHEMA,
    })
    const plan = MutationPlanSchema.safeParse(raw)
    if (!plan.success) return c.json({ error: 'resposta do LLM fora do schema', issues: plan.error.issues }, 502)
    return c.json({ plan: sanitizePlan(plan.data, req.subgraph) })
  } catch (err) {
    if (err instanceof ProviderError) {
      console.error(err.message)
      return c.json({ error: err.message }, 502)
    }
    throw err
  }
})

export default app
