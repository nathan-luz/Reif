/** Modelos que os leitores consomem (guardados como derivado 'model'). */
export interface HtmlModel {
  type: 'html'
  html: string
}

export interface ChaptersModel {
  type: 'chapters'
  chapters: { title: string; html: string }[]
}

export interface Slide {
  title: string
  paragraphs: string[]
  images: string[]
  notes: string
}

export interface SlidesModel {
  type: 'slides'
  slides: Slide[]
}

/** Texto puro preservando a separação entre blocos (parágrafos, títulos, itens, células). */
export const htmlToText = (html: string) =>
  new DOMParser()
    .parseFromString(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|h[1-6]|li|div|tr|td|th|section|article|blockquote|pre)>/gi, '$&\n'),
      'text/html',
    )
    .body.textContent?.replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() ?? ''

export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
