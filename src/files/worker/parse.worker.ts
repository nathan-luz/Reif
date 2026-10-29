/// <reference lib="webworker" />
/**
 * Conversões pesadas fora da thread principal: DOCX (mammoth) e planilhas (SheetJS).
 * Recebe o ArrayBuffer transferido (sem cópia) e devolve dados prontos para o leitor.
 */
import type { WorkerRequest, WorkerResponse } from './protocol'

async function handle(req: WorkerRequest): Promise<unknown> {
  switch (req.op) {
    case 'docx': {
      const mammoth = (await import('mammoth/mammoth.browser.js')).default
      const { value } = await mammoth.convertToHtml({ arrayBuffer: req.buffer })
      return { html: value }
    }
    case 'sheet': {
      const { parseSheet } = await import('./sheet')
      return parseSheet(req.buffer, req.name)
    }
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id } = e.data
  try {
    const result = await handle(e.data)
    self.postMessage({ id, ok: true, result } satisfies WorkerResponse)
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}
