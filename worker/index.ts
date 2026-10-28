import { Hono } from 'hono'

type Env = {
  GEMINI_API_KEY: string
  ANTHROPIC_API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

export default app
