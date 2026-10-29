export interface NotebookOutput {
  kind: 'text' | 'image'
  data: string
}

export interface NotebookCell {
  type: 'markdown' | 'code'
  source: string
  outputs: NotebookOutput[]
}

export interface NotebookModel {
  type: 'notebook'
  language: string
  cells: NotebookCell[]
}

const join = (v: unknown) => (Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '')

/** .ipynb (nbformat 4) → modelo do leitor. Puro. Imagens de saída limitadas para não inflar. */
export function parseNotebook(json: unknown, maxImageChars = 2_000_000): NotebookModel {
  const nb = json as { cells?: unknown[]; metadata?: { kernelspec?: { language?: string }; language_info?: { name?: string } } }
  const language = nb.metadata?.language_info?.name ?? nb.metadata?.kernelspec?.language ?? 'python'
  const cells: NotebookCell[] = []
  for (const raw of nb.cells ?? []) {
    const c = raw as { cell_type?: string; source?: unknown; outputs?: unknown[] }
    if (c.cell_type !== 'markdown' && c.cell_type !== 'code') continue
    const outputs: NotebookOutput[] = []
    for (const o of c.outputs ?? []) {
      const out = o as { output_type?: string; text?: unknown; data?: Record<string, unknown>; ename?: string; evalue?: string }
      if (out.output_type === 'stream') outputs.push({ kind: 'text', data: join(out.text) })
      else if (out.output_type === 'error') outputs.push({ kind: 'text', data: `${out.ename}: ${out.evalue}` })
      else if (out.data) {
        const png = join(out.data['image/png'])
        const jpeg = join(out.data['image/jpeg'])
        if (png && png.length <= maxImageChars) outputs.push({ kind: 'image', data: `data:image/png;base64,${png.replace(/\s/g, '')}` })
        else if (jpeg && jpeg.length <= maxImageChars) outputs.push({ kind: 'image', data: `data:image/jpeg;base64,${jpeg.replace(/\s/g, '')}` })
        else if (out.data['text/plain']) outputs.push({ kind: 'text', data: join(out.data['text/plain']) })
      }
    }
    cells.push({ type: c.cell_type, source: join(c.source), outputs })
  }
  return { type: 'notebook', language, cells }
}
