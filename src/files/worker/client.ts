import type { WorkerRequest, WorkerResponse } from './protocol'

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const p = pending.get(e.data.id)
    if (!p) return
    pending.delete(e.data.id)
    if (e.data.ok) p.resolve(e.data.result)
    else p.reject(new Error(e.data.error))
  }
  return worker
}

/** Executa uma conversão no worker de parsing (o buffer é transferido, não copiado). */
export function runInWorker<T>(op: WorkerRequest['op'], buffer: ArrayBuffer, name: string): Promise<T> {
  const id = ++seq
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
    getWorker().postMessage({ id, op, buffer, name } satisfies WorkerRequest, [buffer])
  })
}
