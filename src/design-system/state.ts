import { atom } from 'tldraw'
import { DEFAULT_DESIGN_SYSTEM_ID, getDesignSystem, type DesignSystem } from '../shared/design-systems'

const STORAGE_KEY = 'reif:design-system'

function load(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_DESIGN_SYSTEM_ID
  } catch {
    return DEFAULT_DESIGN_SYSTEM_ID
  }
}

/** Preferência do usuário (como claro/escuro): vale para as próximas gerações e re-skin das anteriores. */
export const designSystemId = atom('reif:design-system-id', getDesignSystem(load()).id)

export function setDesignSystem(id: string) {
  designSystemId.set(getDesignSystem(id).id)
  try {
    localStorage.setItem(STORAGE_KEY, designSystemId.get())
  } catch {
    /* storage indisponível */
  }
}

export const currentDesignSystem = (): DesignSystem => getDesignSystem(designSystemId.get())
