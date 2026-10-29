/** Extensão → linguagem do highlight.js (carregada sob demanda). */
export const CODE_LANG: Record<string, string> = {
  py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', java: 'java', c: 'c', h: 'c',
  cpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php', sql: 'sql', r: 'r', m: 'matlab', kt: 'kotlin',
  swift: 'swift', sh: 'bash', yaml: 'yaml', yml: 'yaml', xml: 'xml', css: 'css', tex: 'latex', toml: 'ini', json: 'json',
}

export const LANG_LABEL: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#',
  go: 'Go', rust: 'Rust', ruby: 'Ruby', php: 'PHP', sql: 'SQL', r: 'R', matlab: 'MATLAB', kotlin: 'Kotlin', swift: 'Swift',
  bash: 'Shell', yaml: 'YAML', xml: 'XML', css: 'CSS', latex: 'LaTeX', ini: 'TOML', json: 'JSON',
}

/** Primeiras linhas (preserva quebras — para cartões de código). */
export const headLines = (text: string, lines = 14, chars = 700) => text.split(/\r?\n/).slice(0, lines).join('\n').slice(0, chars)
