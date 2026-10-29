import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { components } from './canvas/components'
import { ExternalContentBridge } from './canvas/ExternalContentBridge'
import { PromptShortcut } from './canvas/PromptShortcut'
import { customShapeUtils } from './shapes'

const licenseKey: string | undefined = import.meta.env.VITE_TLDRAW_LICENSE_KEY

export default function App() {
  return (
    <div className="fixed inset-0">
      <Tldraw
        persistenceKey="reif-main"
        shapeUtils={customShapeUtils}
        components={components}
        {...(licenseKey ? { licenseKey } : {})}
      >
        <ExternalContentBridge />
        <PromptShortcut />
      </Tldraw>
    </div>
  )
}
