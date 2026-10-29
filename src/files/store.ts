/**
 * Armazenamento local dos arquivos (fora do documento do tldraw):
 *  - blobs:   fileId → arquivo original
 *  - derived: `${fileId}:${key}` → derivados calculados uma vez (thumb, picos, texto, modelo do leitor)
 * O documento guarda só o fileId — o canvas continua leve.
 */
const DB_NAME = 'reif-files'
const STORES = ['blobs', 'derived'] as const
type Store = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(store, mode).objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putBlob = (id: string, blob: Blob) => tx('blobs', 'readwrite', (s) => s.put(blob, id))
export const getBlob = (id: string) => tx<Blob | undefined>('blobs', 'readonly', (s) => s.get(id))

export const putDerived = (id: string, key: string, value: unknown) => tx('derived', 'readwrite', (s) => s.put(value, `${id}:${key}`))
export const getDerived = <T>(id: string, key: string) => tx<T | undefined>('derived', 'readonly', (s) => s.get(`${id}:${key}`))

export const newFileId = () => crypto.randomUUID()

/** Object URLs reaproveitados por sessão (evita recriar a cada render). */
const urlCache = new Map<string, string>()
export async function objectUrlFor(cacheKey: string, load: () => Promise<Blob | undefined>): Promise<string | null> {
  const hit = urlCache.get(cacheKey)
  if (hit) return hit
  const blob = await load()
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urlCache.set(cacheKey, url)
  return url
}

/** Pede ao navegador para não apagar os dados; avisa se o espaço estiver acabando. */
export async function checkStorage(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  if (!navigator.storage?.estimate) return null
  const persisted = (await navigator.storage.persisted?.()) || (await navigator.storage.persist?.()) || false
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota, persisted }
}
