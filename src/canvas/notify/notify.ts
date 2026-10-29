import { atom } from 'tldraw'

export interface Notice {
  id: number
  message: string
  severity: 'info' | 'warning' | 'error'
}

export const notices = atom<Notice[]>('reif:notices', [])
let seq = 0

/** Aviso não bloqueante (some sozinho). Usável fora de componentes React. */
export function notify(message: string, severity: Notice['severity'] = 'info', ms = 5000) {
  const id = ++seq
  notices.update((n) => [...n.slice(-3), { id, message, severity }])
  setTimeout(() => notices.update((n) => n.filter((x) => x.id !== id)), ms)
}
