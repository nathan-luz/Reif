import { useEffect } from 'react'
import { react, useToasts } from 'tldraw'
import { notices } from './notify'

const SEVERITY = { info: 'info', warning: 'warning', error: 'error' } as const

/** `notify()` (usável fora do React) → toasts nativos do tldraw. */
export function NoticesBridge() {
  const { addToast } = useToasts()
  useEffect(() => {
    const shown = new Set<number>()
    return react('reif:notices→toasts', () => {
      for (const n of notices.get()) {
        if (shown.has(n.id)) continue
        shown.add(n.id)
        addToast({ title: n.message, severity: SEVERITY[n.severity] })
      }
    })
  }, [addToast])
  return null
}
