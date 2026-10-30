import type { TLUiOverrides } from 'tldraw'
import { toggleInsertMenu } from './insert/state'
import { pickFiles } from './media/pickFiles'
import { translations } from './translations'

/** Referência estável (nível de módulo) passada ao <Tldraw overrides>. */
export const overrides: TLUiOverrides = {
  translations,
  tools(_editor, tools) {
    const asset = tools['asset']
    if (!asset) return tools
    // "Mídia" vira "Inserir": ícone de upload e popover com upload, imagem da web, gravação e link.
    return { ...tools, asset: { ...asset, icon: 'reif-upload', onSelect: toggleInsertMenu } }
  },
  actions(editor, actions) {
    const insertMedia = actions['insert-media']
    if (!insertMedia) return actions
    // "Upload media…" (menu principal / Ctrl+U): seletor que aceita todos os formatos.
    return { ...actions, 'insert-media': { ...insertMedia, onSelect: () => pickFiles(editor) } }
  },
}
