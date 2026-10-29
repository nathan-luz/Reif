import { htmlToText, type HtmlModel } from '../office/models'
import { decodeText } from '../office/sheetModel'
import { excerptOf, MAX_TEXT, plural, type Analyzer } from './types'

/** HTML local ou artigo da web → versão de leitura limpa (Mozilla Readability). */
export const analyzeHtml: Analyzer = async (file, name, ctx) => {
  const raw = decodeText(new Uint8Array(await file.arrayBuffer()))
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  if (ctx?.sourceUrl) {
    // links/imagens relativos passam a apontar para o site de origem
    const base = doc.createElement('base')
    base.href = ctx.sourceUrl
    doc.head.prepend(base)
    for (const el of doc.querySelectorAll<HTMLImageElement | HTMLAnchorElement>('img[src], a[href]')) {
      if (el instanceof HTMLImageElement) el.setAttribute('src', el.src)
      else el.setAttribute('href', el.href)
    }
  }
  const { Readability } = await import('@mozilla/readability')
  const article = new Readability(doc.cloneNode(true) as Document, { charThreshold: 200 }).parse()
  const html = article?.content ?? doc.body?.innerHTML ?? ''
  const text = (article?.textContent ? article.textContent : htmlToText(html)).replace(/\s+\n/g, '\n').slice(0, MAX_TEXT)
  const title = article?.title?.trim() || doc.title?.trim() || name.replace(/\.html?$/i, '')
  const model: HtmlModel = { type: 'html', html }
  return {
    stats: `${plural(text.split(/\s+/).filter(Boolean).length, 'palavra', 'palavras')}${article?.siteName ? ` · ${article.siteName}` : ''}`,
    excerpt: excerptOf(article?.excerpt || text),
    text,
    model,
    title,
  }
}
