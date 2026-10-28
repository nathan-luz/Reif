import type { TLComponents } from 'tldraw'
import { InFrontOfTheCanvas } from './InFrontOfTheCanvas'

/** Referência estável: o tldraw remonta a UI se esse objeto mudar. */
export const components: TLComponents = { InFrontOfTheCanvas }
