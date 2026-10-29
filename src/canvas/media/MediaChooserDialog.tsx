import {
  TldrawUiButton,
  TldrawUiButtonLabel,
  TldrawUiDialogBody,
  TldrawUiDialogCloseButton,
  TldrawUiDialogHeader,
  TldrawUiDialogTitle,
  type TLUiDialogProps,
} from 'tldraw'
import { openImagePicker } from '../image-picker/state'

interface Props extends TLUiDialogProps {
  /** Seletor de arquivos nativo do tldraw (helpers.insertMedia). */
  onUpload: () => void
}

/** Substitui o clique da ferramenta "Mídia": escolher entre upload local e busca na web. */
export function MediaChooserDialog({ onClose, onUpload }: Props) {
  return (
    <>
      <TldrawUiDialogHeader>
        <TldrawUiDialogTitle>Inserir imagem</TldrawUiDialogTitle>
        <TldrawUiDialogCloseButton />
      </TldrawUiDialogHeader>
      <TldrawUiDialogBody style={{ display: 'flex', gap: 8, paddingBottom: 16 }}>
        <TldrawUiButton
          type="normal"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => {
            onClose()
            onUpload()
          }}
          data-testid="media-upload"
        >
          <TldrawUiButtonLabel>⬆ Fazer upload</TldrawUiButtonLabel>
        </TldrawUiButton>
        <TldrawUiButton
          type="primary"
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => {
            onClose()
            openImagePicker({ query: '' })
          }}
          data-testid="media-search-web"
        >
          <TldrawUiButtonLabel>🔎 Buscar na web</TldrawUiButtonLabel>
        </TldrawUiButton>
      </TldrawUiDialogBody>
    </>
  )
}
