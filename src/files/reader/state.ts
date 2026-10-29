import { atom, type TLShapeId } from 'tldraw'

/** Cartão aberto no painel leitor (null = fechado). */
export const readerTarget = atom<TLShapeId | null>('reif:reader-target', null)
export const openReader = (id: TLShapeId) => readerTarget.set(id)
export const closeReader = () => readerTarget.set(null)
