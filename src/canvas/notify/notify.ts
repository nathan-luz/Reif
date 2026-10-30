import { atom } from 'tldraw'

export interface Notice {
  id: number
  message: string
  severity: 'info' | 'warning' | 'error'
}

/** Fila consumida pelo NoticesBridge (toasts nativos do tldraw). */
export const notices = atom<Notice[]>('reif:notices', [])
let seq = 0

/** Aviso não bloqueante. Usável fora de componentes React. */
export function notify(message: string, severity: Notice['severity'] = 'info') {
  const id = ++seq
  notices.update((n) => [...n.slice(-9), { id, message, severity }])
}
