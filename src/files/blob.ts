import type { FileShape } from '../shapes/file/types'
import { getBlob } from './store'

/** Downloads de arquivos só-link nesta sessão (promise em cache: chamadas simultâneas baixam uma vez). */
const remoteCache = new Map<string, Promise<Blob>>()

export async function downloadViaProxy(url: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`/api/files/fetch?url=${encodeURIComponent(url)}`, signal ? { signal } : {})
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
  return res.blob()
}

/** Blob do arquivo: IndexedDB (cópia local) ou download sob demanda (só link). */
export async function getFileBlob(shape: FileShape): Promise<Blob> {
  const { fileId, sourceUrl } = shape.props
  if (fileId) {
    const blob = await getBlob(fileId)
    if (blob) return blob
  }
  if (!sourceUrl) throw new Error('Arquivo não encontrado neste navegador')
  let pending = remoteCache.get(sourceUrl)
  if (!pending) {
    pending = downloadViaProxy(sourceUrl)
    remoteCache.set(sourceUrl, pending)
    pending.catch(() => remoteCache.delete(sourceUrl))
  }
  return pending
}

/** Chave estável para derivados (thumb/texto) de arquivos locais ou só-link. */
export const derivedKey = (shape: FileShape) => shape.props.fileId || `url:${shape.props.sourceUrl}`
