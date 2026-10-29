import { atom, type TLShapeId } from 'tldraw'

export interface ImagePickerState {
  query: string
  /** Slot a ser substituído pela imagem escolhida (vindo do LLM). */
  slotId?: TLShapeId
}

/** null = fechado. */
export const imagePicker = atom<ImagePickerState | null>('reif:image-picker', null)

export const openImagePicker = (state: ImagePickerState) => imagePicker.set(state)
export const closeImagePicker = () => imagePicker.set(null)
