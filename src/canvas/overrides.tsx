import type { TLUiOverrides } from 'tldraw'
import { MediaChooserDialog } from './media/MediaChooserDialog'

/** Referência estável (nível de módulo) passada ao <Tldraw overrides>. */
export const overrides: TLUiOverrides = {
  tools(_editor, tools, helpers) {
    const asset = tools['asset']
    if (!asset) return tools
    return {
      ...tools,
      asset: {
        ...asset,
        onSelect() {
          helpers.addDialog({
            component: ({ onClose }) => <MediaChooserDialog onClose={onClose} onUpload={() => void helpers.insertMedia()} />,
          })
        },
      },
    }
  },
}
