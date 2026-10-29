import { afterEach, expect, it, vi } from 'vitest'
import { uploadToGemini } from './fileAi'

afterEach(() => vi.unstubAllGlobals())

it('upload resumível: start → upload/finalize (streaming) → espera sair de PROCESSING', async () => {
  vi.useFakeTimers()
  const calls: { url: string; headers: Headers; method: string }[] = []
  let polls = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, headers: new Headers(init.headers), method: init.method ?? 'GET' })
    if (url.endsWith('/upload/v1beta/files')) return new Response('{}', { headers: { 'x-goog-upload-url': 'https://upload.example/session' } })
    if (url === 'https://upload.example/session') return Response.json({ file: { name: 'files/abc', uri: 'https://gen/files/abc', mimeType: 'audio/wav', state: 'PROCESSING' } })
    polls++
    return Response.json({ name: 'files/abc', uri: 'https://gen/files/abc', mimeType: 'audio/wav', state: polls < 2 ? 'PROCESSING' : 'ACTIVE' })
  }))
  const body = new Blob(['x'.repeat(10)]).stream()
  const promise = uploadToGemini('KEY', body, 10, 'audio/wav', 'aula.wav')
  await vi.runAllTimersAsync()
  const file = await promise
  vi.useRealTimers()

  expect(file).toMatchObject({ uri: 'https://gen/files/abc', state: 'ACTIVE' })
  expect(calls[0]!.headers.get('x-goog-upload-command')).toBe('start')
  expect(calls[0]!.headers.get('x-goog-upload-header-content-length')).toBe('10')
  expect(calls[1]!.headers.get('x-goog-upload-command')).toBe('upload, finalize')
  expect(calls[1]!.headers.get('x-goog-api-key')).toBeNull() // a sessão de upload não precisa da chave
  expect(polls).toBe(2)
})
