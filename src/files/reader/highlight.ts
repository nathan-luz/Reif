import type { HLJSApi, LanguageFn } from 'highlight.js'

/** Só o core + a linguagem usada são baixados (não o pacote inteiro do highlight.js). */
const LOADERS: Record<string, () => Promise<{ default: LanguageFn }>> = {
  python: () => import('highlight.js/lib/languages/python'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  java: () => import('highlight.js/lib/languages/java'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  php: () => import('highlight.js/lib/languages/php'),
  sql: () => import('highlight.js/lib/languages/sql'),
  r: () => import('highlight.js/lib/languages/r'),
  matlab: () => import('highlight.js/lib/languages/matlab'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  swift: () => import('highlight.js/lib/languages/swift'),
  bash: () => import('highlight.js/lib/languages/bash'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  xml: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  latex: () => import('highlight.js/lib/languages/latex'),
  ini: () => import('highlight.js/lib/languages/ini'),
  json: () => import('highlight.js/lib/languages/json'),
}

let core: Promise<HLJSApi> | null = null

export async function highlight(code: string, lang: string): Promise<string> {
  core ??= import('highlight.js/lib/core').then((m) => m.default)
  const hljs = await core
  const load = LOADERS[lang]
  if (load && !hljs.getLanguage(lang)) hljs.registerLanguage(lang, (await load()).default)
  if (!hljs.getLanguage(lang)) return hljs.highlightAuto(code).value
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
}
