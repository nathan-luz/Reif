import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// O parsing/rasterização do pdf.js roda no worker dele (fora da thread principal).
GlobalWorkerOptions.workerSrc = workerUrl

export async function openPdf(blob: Blob): Promise<PDFDocumentProxy> {
  return getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise
}

export async function pdfText(doc: PDFDocumentProxy, maxPages: number, maxChars: number): Promise<string> {
  let out = ''
  for (let i = 1; i <= Math.min(doc.numPages, maxPages) && out.length < maxChars; i++) {
    const content = await (await doc.getPage(i)).getTextContent()
    out += content.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n\n'
  }
  return out.slice(0, maxChars)
}
