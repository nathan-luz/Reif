import type { TLUiOverrides } from 'tldraw'
import { importFromUrl } from '../files/importer'
import { MediaChooserDialog } from './media/MediaChooserDialog'
import { pickFiles } from './media/pickFiles'
import { RecorderDialog } from './media/RecorderDialog'
import { translations } from './translations'

/** Referência estável (nível de módulo) passada ao <Tldraw overrides>. */
export const overrides: TLUiOverrides = {
  translations,
  tools(editor, tools, helpers) {
    const asset = tools['asset']
    if (!asset) return tools
    return {
      ...tools,
      asset: {
        ...asset,
        onSelect() {
          helpers.addDialog({
            component: ({ onClose }) => (
              <MediaChooserDialog
                onClose={onClose}
                onUpload={() => pickFiles(editor)}
                onRecord={() => helpers.addDialog({ component: RecorderDialog })}
                onLink={(url) => void importFromUrl(editor, url)}
              />
            ),
          })
        },
      },
    }
  },
}
