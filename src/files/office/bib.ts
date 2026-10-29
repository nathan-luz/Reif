export interface BibEntry {
  type: string
  key: string
  fields: Record<string, string>
}

/** Parser BibTeX tolerante: @tipo{chave, campo = {valor} | "valor" | número}. Puro. */
export function parseBib(src: string): BibEntry[] {
  const entries: BibEntry[] = []
  const re = /@(\w+)\s*\{\s*([^,\s]*)\s*,/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const type = m[1]!.toLowerCase()
    if (type === 'comment' || type === 'string' || type === 'preamble') continue
    let i = re.lastIndex
    let depth = 1
    const start = i
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
      i++
    }
    const body = src.slice(start, i - 1)
    re.lastIndex = i
    const fields: Record<string, string> = {}
    const fre = /(\w+)\s*=\s*/g
    let f: RegExpExecArray | null
    while ((f = fre.exec(body))) {
      let j = fre.lastIndex
      let value = ''
      if (body[j] === '{') {
        let d = 0
        const s = j
        do {
          if (body[j] === '{') d++
          else if (body[j] === '}') d--
          j++
        } while (j < body.length && d > 0)
        value = body.slice(s + 1, j - 1)
      } else if (body[j] === '"') {
        const end = body.indexOf('"', j + 1)
        value = body.slice(j + 1, end < 0 ? body.length : end)
        j = end < 0 ? body.length : end + 1
      } else {
        const mm = /^[^,\n}]+/.exec(body.slice(j))
        value = mm?.[0]?.trim() ?? ''
        j += value.length
      }
      fields[f[1]!.toLowerCase()] = value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
      fre.lastIndex = j
    }
    entries.push({ type, key: m[2]!, fields })
  }
  return entries
}

/** "Sobrenome, A.; Sobrenome, B." a partir de "A Sobrenome and B Sobrenome". */
export function formatAuthors(raw = ''): string {
  return raw
    .split(/\s+and\s+/i)
    .filter(Boolean)
    .map((a) => {
      const [last, first] = a.includes(',') ? a.split(',').map((x) => x.trim()) : [a.split(' ').pop() ?? a, a.split(' ').slice(0, -1).join(' ')]
      const initials = (first ?? '').split(/\s+/).filter(Boolean).map((n) => `${n[0]}.`).join(' ')
      return initials ? `${(last ?? '').toUpperCase()}, ${initials}` : (last ?? '').toUpperCase()
    })
    .join('; ')
}

/** Referência curta (estilo ABNT simplificado). */
export function citation(e: BibEntry): string {
  const { author, title, journal, booktitle, publisher, year } = e.fields
  const venue = journal || booktitle || publisher
  return [formatAuthors(author), title ? `${title}.` : '', venue ? `${venue},` : '', year ?? ''].filter(Boolean).join(' ').trim()
}
