import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetQuotaBreaker, searchImages } from './search'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

const wikimediaPage = {
  query: {
    pages: {
      '1': {
        pageid: 1,
        title: 'File:Cat.jpg',
        imageinfo: [{ url: 'https://upload/cat.jpg', thumburl: 'https://upload/cat-thumb.jpg', width: 800, height: 600, mime: 'image/jpeg', descriptionurl: 'https://commons/cat', extmetadata: { Artist: { value: '<a>Fulano</a>' }, LicenseShortName: { value: 'CC BY 4.0' } } }],
      },
    },
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetQuotaBreaker()
})

describe('searchImages', () => {
  it('fontes sem chave ficam "unconfigured"; as demais respondem', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('wikimedia')) return json(wikimediaPage)
      if (url.includes('openverse')) return json({ results: [] })
      throw new Error(`inesperado: ${url}`)
    }))
    const res = await searchImages('cat', {})
    const status = Object.fromEntries(res.sources.map((s) => [s.source, s.status]))
    expect(status).toEqual({ unsplash: 'unconfigured', pixabay: 'unconfigured', pexels: 'unconfigured', wikimedia: 'ok', openverse: 'empty' })
    expect(res.results[0]).toMatchObject({ source: 'wikimedia', author: 'Fulano', license: 'CC BY 4.0', url: 'https://upload/cat-thumb.jpg' })
  })

  it('429 marca a fonte como "quota" e ela é pulada até o Retry-After', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('pixabay')) return json({}, 429, { 'retry-after': '30' })
      return json(url.includes('wikimedia') ? wikimediaPage : { results: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const env = { PIXABAY_API_KEY: 'k' }
    const first = await searchImages('dog', env, 'pixabay')
    expect(first.sources).toEqual([{ source: 'pixabay', status: 'quota', count: 0 }])
    const second = await searchImages('dog', env, 'pixabay')
    expect(second.sources[0]?.status).toBe('quota')
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('pixabay'))).toHaveLength(1)
  })

  it('envia User-Agent (proteção anti-bot do Pixabay)', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('user-agent')).toContain('Reif')
      return json({ hits: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    await searchImages('bird', { PIXABAY_API_KEY: 'k2' }, 'pixabay')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
