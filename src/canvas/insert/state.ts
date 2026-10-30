import { atom } from 'tldraw'

export type InsertMode = 'menu' | 'link' | 'record'

/** Popover "Inserir" ancorado na ferramenta da toolbar (null = fechado). */
export const insertMenu = atom<InsertMode | null>('reif:insert-menu', null)

export const toggleInsertMenu = () => insertMenu.update((m) => (m ? null : 'menu'))
export const closeInsertMenu = () => insertMenu.set(null)
