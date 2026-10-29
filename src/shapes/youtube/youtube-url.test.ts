import { describe, expect, it } from 'vitest'
import { embedUrl, parseStart, parseYouTubeUrl } from './youtube-url'

describe('parseYouTubeUrl', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 0],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=90', 90],
    ['https://youtu.be/dQw4w9WgXcQ?t=1m30s', 90],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', 0],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?start=42', 42],
    ['https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ', 0],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 0],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 0],
  ])('%s', (url, start) => {
    expect(parseYouTubeUrl(url)).toEqual({ videoId: 'dQw4w9WgXcQ', start })
  })

  it.each(['not a url', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://youtu.be/'])(
    'rejeita %s',
    (url) => expect(parseYouTubeUrl(url)).toBeNull(),
  )
})

describe('parseStart', () => {
  it.each([
    [null, 0],
    ['', 0],
    ['75', 75],
    ['45s', 45],
    ['2m', 120],
    ['1h2m3s', 3723],
    ['lixo', 0],
  ])('%s → %d', (input, out) => expect(parseStart(input)).toBe(out))
})

it('embedUrl inclui start só quando > 0', () => {
  expect(embedUrl('dQw4w9WgXcQ', 0)).not.toContain('start=')
  expect(embedUrl('dQw4w9WgXcQ', 30)).toContain('start=30')
})
