import type { TLThemes } from 'tldraw'
import { currentDesignSystem } from './state'
import { buildTheme } from './theme'

/** Tema inicial (estável, nível de módulo): registra as cores ds-* antes do store carregar. */
export const initialThemes: Partial<TLThemes> = { default: buildTheme(currentDesignSystem()) }
