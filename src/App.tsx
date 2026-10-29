import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'
import { components } from './canvas/components'
import { ExternalContentBridge } from './canvas/ExternalContentBridge'
import { overrides } from './canvas/overrides'
import { PromptShortcut } from './canvas/PromptShortcut'
import { customShapeUtils } from './shapes'
import { DesignSystemBridge } from './design-system/DesignSystemBridge'
import { initialThemes } from './design-system/initialThemes'

const licenseKey: string | undefined = import.meta.env.VITE_TLDRAW_LICENSE_KEY

/** Em dev, expõe o editor para depuração e testes E2E. */
const onMount = (editor: Editor) => {
  if (import.meta.env.DEV) (window as unknown as { editor: Editor }).editor = editor
}

export default function App() {
  return (
    <div className="fixed inset-0">
      <Tldraw
        persistenceKey="reif-main"
        shapeUtils={customShapeUtils}
        components={components}
        overrides={overrides}
        themes={initialThemes}
        onMount={onMount}
        {...(licenseKey ? { licenseKey } : {})}
      >
        <ExternalContentBridge />
        <PromptShortcut />
        <DesignSystemBridge />
      </Tldraw>
    </div>
  )
}
