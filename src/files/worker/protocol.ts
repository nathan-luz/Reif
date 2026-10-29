export type WorkerRequest =
  | { id: number; op: 'docx'; buffer: ArrayBuffer; name: string }
  | { id: number; op: 'sheet'; buffer: ArrayBuffer; name: string }

export type WorkerResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string }
