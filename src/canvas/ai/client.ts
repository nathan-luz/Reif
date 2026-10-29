import { TransformResponseSchema, type MutationPlan, type TransformRequest } from '../../shared/mutations'

export async function requestTransform(req: TransformRequest, signal?: AbortSignal): Promise<MutationPlan> {
  const res = await fetch('/api/transform', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    ...(signal ? { signal } : {}),
  })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return TransformResponseSchema.parse(body).plan
}
