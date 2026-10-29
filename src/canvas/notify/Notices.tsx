import { useValue } from 'tldraw'
import { notices } from './notify'

const STYLE = {
  info: 'bg-white text-black/80 border-black/10',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  error: 'bg-red-50 text-red-800 border-red-200',
} as const

export function Notices() {
  const list = useValue(notices)
  if (!list.length) return null
  return (
    <div className="pointer-events-none absolute bottom-20 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
      {list.map((n) => (
        <div key={n.id} role="status" className={`rounded-lg border px-3 py-2 text-sm shadow-md ${STYLE[n.severity]}`}>
          {n.message}
        </div>
      ))}
    </div>
  )
}
