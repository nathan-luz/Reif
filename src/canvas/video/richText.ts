import type { TLRichText } from 'tldraw'

type Inline = { type: 'text'; text: string; marks?: { type: 'bold' }[] }
type Block =
  | { type: 'paragraph'; content?: Inline[] }
  | { type: 'bulletList'; content: { type: 'listItem'; content: Block[] }[] }

const text = (t: string, bold = false): Inline => (bold ? { type: 'text', text: t, marks: [{ type: 'bold' }] } : { type: 'text', text: t })
const paragraph = (...inline: Inline[]): Block => ({ type: 'paragraph', content: inline.filter((i) => i.text) })

/** Documento TipTap (formato do rich text do tldraw) com título em negrito e lista. */
export function cardText(opts: { heading?: string; body?: string; bullets?: string[] }): TLRichText {
  const content: Block[] = []
  if (opts.heading) content.push(paragraph(text(opts.heading, true)))
  if (opts.body) content.push(paragraph(text(opts.body)))
  if (opts.bullets?.length) {
    content.push({
      type: 'bulletList',
      content: opts.bullets.map((b) => ({ type: 'listItem', content: [paragraph(text(b))] })),
    })
  }
  return { type: 'doc', content } as unknown as TLRichText
}

/** Linhas "[m:ss] texto" com o timestamp em negrito. */
export function timestampedText(lines: { time: string; text: string }[]): TLRichText {
  return {
    type: 'doc',
    content: lines.map((l) => paragraph(text(`[${l.time}] `, true), text(l.text))),
  } as unknown as TLRichText
}
