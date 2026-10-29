import { excerptOf, MAX_TEXT, plural, type Analyzer } from './types'

/** Remove sintaxe markdown para o trecho do cartão. */
export const stripMarkdown = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>~|-]{1,3}/g, ' ')

export const analyzeText: Analyzer = async (file, name) => {
  const text = (await file.text()).slice(0, MAX_TEXT)
  const isMd = /\.(md|markdown)$/i.test(name)
  const words = text.split(/\s+/).filter(Boolean).length
  const title = isMd ? text.match(/^#\s+(.+)$/m)?.[1]?.trim() : undefined
  return {
    stats: plural(words, 'palavra', 'palavras'),
    excerpt: excerptOf(isMd ? stripMarkdown(text) : text),
    text,
    ...(title ? { title } : {}),
  }
}
