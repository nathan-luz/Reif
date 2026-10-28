import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const licenseKey: string | undefined = import.meta.env.VITE_TLDRAW_LICENSE_KEY

export default function App() {
  return (
    <div className="fixed inset-0">
      <Tldraw persistenceKey="reif-main" {...(licenseKey ? { licenseKey } : {})} />
    </div>
  )
}
