import type { TLComponents } from 'tldraw'
import { InFrontOfTheCanvas } from './InFrontOfTheCanvas'
import { MainMenu } from './MainMenu'

/** Referência estável: o tldraw remonta a UI se esse objeto mudar. */
export const components: TLComponents = { InFrontOfTheCanvas, MainMenu }
