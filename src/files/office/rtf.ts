/** RTF → parágrafos de texto (cobre o RTF gerado por editores comuns). Pura e testável. */
export function rtfToParagraphs(rtf: string): string[] {
  const SKIP = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'listtable', 'listoverridetable', 'themedata', 'datastore', 'latentstyles', 'generator', 'xmlnstbl', 'rsidtbl'])
  const out: string[] = []
  let cur = ''
  const stack: { skip: boolean; uc: number }[] = [{ skip: false, uc: 1 }]
  let skipChars = 0
  let i = 0
  const top = () => stack[stack.length - 1]!
  const emit = (s: string) => {
    if (skipChars > 0) {
      skipChars -= s.length
      return
    }
    if (!top().skip) cur += s
  }
  while (i < rtf.length) {
    const ch = rtf[i]!
    if (ch === '{') {
      stack.push({ ...top() })
      i++
    } else if (ch === '}') {
      if (stack.length > 1) stack.pop()
      i++
    } else if (ch === '\\') {
      const next = rtf[i + 1] ?? ''
      if (next === '\\' || next === '{' || next === '}') {
        emit(next)
        i += 2
      } else if (next === "'") {
        emit(String.fromCharCode(Number.parseInt(rtf.slice(i + 2, i + 4), 16)))
        i += 4
      } else if (next === '*') {
        top().skip = true
        i += 2
      } else if (next === '~') {
        emit(' ')
        i += 2
      } else {
        const m = /^\\([a-z]+)(-?\d+)? ?/i.exec(rtf.slice(i))
        if (!m) {
          i += 2
          continue
        }
        const [all, word, arg] = m as unknown as [string, string, string | undefined]
        i += all.length
        if (SKIP.has(word)) top().skip = true
        else if (word === 'par' || word === 'line') {
          if (!top().skip) {
            out.push(cur)
            cur = ''
          }
        } else if (word === 'tab') emit('\t')
        else if (word === 'uc') top().uc = Number(arg ?? 1)
        else if (word === 'u' && arg !== undefined) {
          const code = Number(arg)
          emit(String.fromCharCode(code < 0 ? code + 65536 : code))
          skipChars = top().uc
        }
      }
    } else if (ch === '\r' || ch === '\n') {
      i++
    } else {
      emit(ch)
      i++
    }
  }
  if (cur) out.push(cur)
  return out.map((p) => p.trim()).filter(Boolean)
}
