import type JSZip from 'jszip'

export async function openZip(blob: Blob): Promise<JSZip> {
  const { default: JSZipCtor } = await import('jszip')
  return JSZipCtor.loadAsync(await blob.arrayBuffer())
}

export function parseXml(text: string, type: DOMParserSupportedType = 'application/xml'): Document {
  return new DOMParser().parseFromString(text, type)
}

export async function readXml(zip: JSZip, path: string): Promise<Document | null> {
  const f = zip.file(path)
  return f ? parseXml(await f.async('text')) : null
}

/** Busca por nome local, ignorando namespaces (OOXML/ODF usam muitos). */
export const byTag = (root: Document | Element, local: string): Element[] => [...root.getElementsByTagNameNS('*', local)]

/** Resolve caminho relativo dentro do zip ("../media/a.png" a partir de "ppt/slides/"). */
export function resolvePath(baseDir: string, rel: string): string {
  if (rel.startsWith('/')) return rel.slice(1)
  const parts = (baseDir ? baseDir.split('/') : []).filter(Boolean)
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

export const dirOf = (path: string) => path.split('/').slice(0, -1).join('/')

const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
}

/** Imagem do zip como data URL (limitada para não inflar o derivado). */
export async function imageDataUrl(zip: JSZip, path: string, budget: { left: number }): Promise<string | null> {
  const f = zip.file(path)
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const mime = MIME[ext]
  if (!f || !mime) return null
  const b64 = await f.async('base64')
  if (b64.length > budget.left) return null
  budget.left -= b64.length
  return `data:${mime};base64,${b64}`
}

/** Até ~25 MB de imagens embutidas por arquivo. */
export const imageBudget = () => ({ left: 25 * 1024 * 1024 })
