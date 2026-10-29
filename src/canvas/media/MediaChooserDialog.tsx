import { useState, type FormEvent } from 'react'
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
  onUpload: () => void
  onRecord: () => void
  onLink: (url: string) => void
}

/** Ferramenta "Mídia": upload de qualquer arquivo, imagem da web, gravação ou link. */
export function MediaChooserDialog({ onClose, onUpload, onRecord, onLink }: Props) {
  const [url, setUrl] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const u = url.trim()
    if (!/^https?:\/\//i.test(u)) return
    onClose()
    onLink(u)
  }
  const button = (label: string, testId: string, action: () => void, primary = false) => (
    <TldrawUiButton
      type={primary ? 'primary' : 'normal'}
      style={{ justifyContent: 'flex-start' }}
      onClick={() => {
        onClose()
        action()
      }}
      data-testid={testId}
    >
      <TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
    </TldrawUiButton>
  )
  return (
    <>
      <TldrawUiDialogHeader>
        <TldrawUiDialogTitle>Inserir</TldrawUiDialogTitle>
        <TldrawUiDialogCloseButton />
      </TldrawUiDialogHeader>
      <TldrawUiDialogBody style={{ display: 'grid', gap: 6, paddingBottom: 16, minWidth: 340 }}>
        {button('⬆ Fazer upload (imagem, PDF, áudio, documento…)', 'media-upload', onUpload, true)}
        {button('🔎 Buscar imagem na web', 'media-search-web', () => openImagePicker({ query: '' }))}
        {button('🎙 Gravar áudio', 'media-record', onRecord)}
        <form onSubmit={submit} className="mt-2 flex gap-2" onKeyDown={(e) => e.stopPropagation()}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Colar link de arquivo ou artigo"
            aria-label="Link de arquivo ou artigo"
            className="min-w-0 flex-1 rounded-md border border-[var(--tl-color-muted-2)] bg-transparent px-2 py-1.5 text-xs outline-none"
            data-testid="media-link"
          />
          <TldrawUiButton type="normal" htmlButtonType="submit">
            <TldrawUiButtonLabel>Adicionar</TldrawUiButtonLabel>
          </TldrawUiButton>
        </form>
      </TldrawUiDialogBody>
    </>
  )
}
