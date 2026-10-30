import { z } from 'zod'
import { getDesignSystem } from '../../src/shared/design-systems'

/**
 * Ilustrações geradas por IA no Workers AI (FLUX.1 schnell — plano gratuito da Cloudflare,
 * sem cartão). O assunto vem do LLM; o ESTILO vem do design system ativo, para todas as
 * imagens do board parecerem do mesmo caderno. Texto dentro da imagem é proibido: rótulos
 * são sempre shapes do Reif (editáveis e corretos).
 */

export const GenerateRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(600),
  designSystem: z.string().max(40).optional(),
})

const NO_TEXT = 'absolutely no text, no letters, no words, no labels, no numbers, no watermark, no border, no frame'

export function buildImagePrompt(subject: string, designSystem?: string): string {
  const ds = getDesignSystem(designSystem)
  return `${subject.trim().replace(/[.\s]+$/, '')}. Style: ${ds.imageStyle.prompt}. ${NO_TEXT}.`
}

const MODEL = '@cf/black-forest-labs/flux-1-schnell'

export interface ImageGenEnv {
  /** Binding do Workers AI (produção, se configurado). */
  AI?: { run(model: string, input: { prompt: string; steps?: number }): Promise<{ image?: string }> }
  /** Alternativa sem binding (funciona no dev sem login): REST do Workers AI. */
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_AI_TOKEN?: string
}

async function runFlux(env: ImageGenEnv, prompt: string): Promise<string | undefined> {
  const input = { prompt, steps: 6 }
  if (env.AI) return (await env.AI.run(MODEL, input)).image
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CLOUDFLARE_AI_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const body = (await res.json().catch(() => ({}))) as { result?: { image?: string }; errors?: { message?: string }[] }
  if (!res.ok) throw new Error(`Workers AI ${res.status}: ${body.errors?.[0]?.message ?? 'erro'}`)
  return body.result?.image
}

export const imageGenConfigured = (env: ImageGenEnv) => Boolean(env.AI || (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN))

export async function generateImage(env: ImageGenEnv, req: z.infer<typeof GenerateRequestSchema>) {
  if (!imageGenConfigured(env)) return { error: 'Geração de imagens não configurada (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN).', status: 501 as const }
  const image = await runFlux(env, buildImagePrompt(req.prompt, req.designSystem))
  if (!image) return { error: 'O modelo não devolveu imagem.', status: 502 as const }
  return {
    image: `data:image/jpeg;base64,${image}`,
    removeBackground: getDesignSystem(req.designSystem).imageStyle.removeBackground,
  }
}
