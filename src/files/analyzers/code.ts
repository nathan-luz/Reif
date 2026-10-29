import { extensionOf } from '../kinds'
import { CODE_LANG, headLines, LANG_LABEL } from '../office/codeLang'
import { MAX_TEXT, plural, type Analyzer } from './types'

export const analyzeCode: Analyzer = async (file, name) => {
  const text = (await file.text()).slice(0, MAX_TEXT)
  const lang = CODE_LANG[extensionOf(name)] ?? 'plaintext'
  const lines = text.split(/\r?\n/).length
  return { stats: `${LANG_LABEL[lang] ?? 'Código'} · ${plural(lines, 'linha', 'linhas')}`, excerpt: headLines(text), text }
}
