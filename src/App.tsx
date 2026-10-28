import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { components } from './canvas/components'

const licenseKey: string | undefined = import.meta.env.VITE_TLDRAW_LICENSE_KEY

export default function App() {
  return (
    <div className="fixed inset-0">
      <Tldraw
        persistenceKey="reif-main"
        components={components}
        {...(licenseKey ? { licenseKey } : {})}
      />
    </div>
  )
}
