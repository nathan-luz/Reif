import type { FileShape } from '../shapes/file/types'
import { getBlob } from './store'

/** Arquivos só-link baixados nesta sessão (não persistidos). */
const remoteCache = new Map<string, Blob>()

export async function downloadViaProxy(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`/api/files/fetch?url=${encodeURIComponent(url)}`, signal ? { signal } : {})
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
  return res.blob()
}

/** Blob do arquivo: IndexedDB (cópia local) ou download sob demanda (só link). */
export async function getFileBlob(shape: FileShape, signal?: AbortSignal): Promise<Blob> {
  const { fileId, sourceUrl } = shape.props
  if (fileId) {
    const blob = await getBlob(fileId)
    if (blob) return blob
  }
  if (!sourceUrl) throw new Error('Arquivo não encontrado neste navegador')
  const cached = remoteCache.get(sourceUrl)
  if (cached) return cached
  const blob = await downloadViaProxy(sourceUrl, signal)
  remoteCache.set(sourceUrl, blob)
  return blob
}

/** Chave estável para derivados (thumb/texto) de arquivos locais ou só-link. */
export const derivedKey = (shape: FileShape) => shape.props.fileId || `url:${shape.props.sourceUrl}`
