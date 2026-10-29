import type { TLComponents } from 'tldraw'
import { InFrontOfTheCanvas } from './InFrontOfTheCanvas'
import { TopPanel } from './TopPanel'

/** Referência estável: o tldraw remonta a UI se esse objeto mudar. */
export const components: TLComponents = { InFrontOfTheCanvas, TopPanel }
