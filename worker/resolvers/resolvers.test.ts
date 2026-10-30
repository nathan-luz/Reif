import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LLMPlan } from '../../src/shared/mutations'
import { resolvePlan } from './index'

afterEach(() => vi.unstubAllGlobals())

const plan: LLMPlan = {
  design: '',
  layout: { type: 'free' },
  summary: 's',
  delete: [],
  update: [],
  create: [
    { ref: 'n1', kind: 'note', text: 'A', x: 0, y: 0, points: [] },
    { ref: 'v1', kind: 'youtube', text: 'vídeo', query: 'fotossíntese', x: 0, y: 0, points: [] },
  ],
  connect: [{ from: 'n1', to: 'v1' }],
}

describe('resolvePlan', () => {
  it('sem YOUTUBE_API_KEY descarta o vídeo, suas conexões e avisa', async () => {
    const out = await resolvePlan(plan, {})
    expect(out.plan.create.map((c) => c.ref)).toEqual(['n1'])
    expect(out.plan.connect).toEqual([])
    expect(out.warnings[0]).toContain('YOUTUBE_API_KEY')
  })

  it('resolve query → videoId real', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ id: { videoId: 'abcdefghijk' }, snippet: { title: 'Aula &amp; Exemplos' } }] })),
    ))
    const out = await resolvePlan(plan, { YOUTUBE_API_KEY: 'k' })
    expect(out.plan.create[1]?.youtube).toEqual({ videoId: 'abcdefghijk', title: 'Aula & Exemplos' })
    expect(out.plan.connect).toHaveLength(1)
    expect(out.warnings).toEqual([])
  })
})
