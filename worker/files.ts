import { USER_AGENT } from './images/types'

const MAX_BYTES = 300 * 1024 * 1024

function parseUrl(raw: string | undefined): URL | null {
  try {
    const url = new URL(raw ?? '')
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function nameFrom(res: Response, url: URL): string {
  const cd = res.headers.get('content-disposition') ?? ''
  const star = cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i)?.[1]
  const plain = cd.match(/filename="?([^";]+)"?/i)?.[1]
  const fromPath = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
  return decodeURIComponent((star ?? plain ?? fromPath).trim()) || 'arquivo'
}

/** Tamanho, tipo e nome sem baixar o arquivo (HEAD; fallback Range 0-0). */
export async function headFile(raw: string | undefined): Promise<Response> {
  const url = parseUrl(raw)
  if (!url) return Response.json({ error: 'url inválida' }, { status: 400 })
  const init = { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow' as const, signal: AbortSignal.timeout(15_000) }
  let res = await fetch(url, { ...init, method: 'HEAD' })
  let size = Number(res.headers.get('content-length') ?? 0)
  if (!res.ok || !size) {
    res = await fetch(url, { ...init, headers: { ...init.headers, Range: 'bytes=0-0' } })
    size = Number(res.headers.get('content-range')?.split('/')[1] ?? res.headers.get('content-length') ?? 0)
    void res.body?.cancel()
  }
  if (!res.ok) return Response.json({ error: `origem ${res.status}` }, { status: 502 })
  return Response.json({ name: nameFrom(res, url), size: Number.isFinite(size) ? size : 0, type: (res.headers.get('content-type') ?? '').split(';')[0] })
}

/** Proxy de download (evita CORS), em streaming, com limite de tamanho. */
export async function fetchFile(raw: string | undefined): Promise<Response> {
  const url = parseUrl(raw)
  if (!url) return new Response('url inválida', { status: 400 })
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(120_000) })
  if (!res.ok) return new Response(`origem ${res.status}`, { status: 502 })
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return new Response('arquivo grande demais', { status: 413 })
  return new Response(res.body, {
    headers: {
      'content-type': res.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'private, max-age=3600',
    },
  })
}
