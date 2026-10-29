import { describe, expect, it } from 'vitest'
import { interleave, type ImageHit } from './images'

const hit = (source: ImageHit['source'], n: number, over: Partial<ImageHit> = {}): ImageHit => ({
  id: `${source}:${n}`, source, thumb: '', url: `https://${source}/${n}.jpg`, width: 100, height: 100,
  title: `${source} ${n}`, pageUrl: '', hotlink: false, ...over,
})

describe('interleave', () => {
  it('alterna as fontes (1º de cada, 2º de cada...)', () => {
    const out = interleave([[hit('unsplash', 1), hit('unsplash', 2)], [hit('pixabay', 1)], [hit('wikimedia', 1), hit('wikimedia', 2)]])
    expect(out.map((h) => h.id)).toEqual(['unsplash:1', 'pixabay:1', 'wikimedia:1', 'unsplash:2', 'wikimedia:2'])
  })

  it('remove duplicatas por URL e por título+tamanho na mesma fonte', () => {
    const out = interleave([
      [hit('wikimedia', 1), hit('wikimedia', 2, { title: 'wikimedia 1' }), hit('wikimedia', 3)],
      [hit('openverse', 1, { url: 'https://wikimedia/1.jpg' })],
    ])
    expect(out.map((h) => h.id)).toEqual(['wikimedia:1', 'wikimedia:3'])
  })
})
