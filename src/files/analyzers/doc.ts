import { escapeHtml, htmlToText, type HtmlModel } from '../office/models'
import { rtfToParagraphs } from '../office/rtf'
import { byTag, openZip, readXml } from '../office/zip'
import { extensionOf } from '../kinds'
import { runInWorker } from '../worker/client'
import { excerptOf, MAX_TEXT, plural, type Analyzer } from './types'

/** ODT (content.xml) → HTML simples: títulos, parágrafos, listas e tabelas. */
async function odtToHtml(blob: Blob): Promise<string> {
  const zip = await openZip(blob)
  const doc = await readXml(zip, 'content.xml')
  if (!doc) throw new Error('ODT inválido')
  const body = byTag(doc, 'text')[0] ?? doc.documentElement
  const render = (el: Element): string => {
    const name = el.localName
    const inner = () => [...el.childNodes].map((n) => (n.nodeType === 3 ? escapeHtml(n.textContent ?? '') : n.nodeType === 1 ? render(n as Element) : '')).join('')
    switch (name) {
      case 'h': {
        const level = Math.min(6, Math.max(1, Number(el.getAttributeNS('*', 'outline-level') ?? el.getAttribute('text:outline-level') ?? 2)))
        return `<h${level}>${inner()}</h${level}>`
      }
      case 'p':
        return `<p>${inner()}</p>`
      case 'list':
        return `<ul>${inner()}</ul>`
      case 'list-item':
        return `<li>${inner()}</li>`
      case 'table':
        return `<table>${inner()}</table>`
      case 'table-row':
        return `<tr>${inner()}</tr>`
      case 'table-cell':
        return `<td>${inner()}</td>`
      case 's':
        return ' '
      case 'tab':
        return '\t'
      case 'line-break':
        return '<br>'
      case 'sequence-decls':
      case 'tracked-changes':
        return ''
      default:
        return inner()
    }
  }
  return render(body)
}

async function rtfToHtml(blob: Blob): Promise<string> {
  return rtfToParagraphs(await blob.text()).map((p) => `<p>${escapeHtml(p)}</p>`).join('')
}

export const analyzeDoc: Analyzer = async (file, name) => {
  const ext = extensionOf(name)
  const html =
    ext === 'docx'
      ? (await runInWorker<{ html: string }>('docx', await file.arrayBuffer(), name)).html
      : ext === 'odt'
        ? await odtToHtml(file)
        : await rtfToHtml(file)
  const text = htmlToText(html).slice(0, MAX_TEXT)
  const title = new DOMParser().parseFromString(html, 'text/html').querySelector('h1')?.textContent?.trim()
  const model: HtmlModel = { type: 'html', html }
  return {
    stats: plural(text.split(/\s+/).filter(Boolean).length, 'palavra', 'palavras'),
    excerpt: excerptOf(text),
    text,
    model,
    ...(title ? { title } : {}),
  }
}
