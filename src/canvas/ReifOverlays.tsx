import { useCallback } from 'react'
import { useEditor, type TLShapeId } from 'tldraw'
import { currentDesignSystem } from '../design-system/state'
import { attachmentsFor } from '../files/ai'
import { ReaderPanel } from '../files/reader/ReaderPanel'
import { IMAGE_SLOT_SHAPE } from '../shapes/image-slot/types'
import { requestTransform } from './ai/client'
import { ImagePicker } from './image-picker/ImagePicker'
import { openImagePicker } from './image-picker/state'
import { InsertPopover } from './insert/InsertPopover'
import { applyPlan } from './mutations/apply'
import { Overlay } from './Overlay'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

/**
 * Sobreposições do Reif. Montadas como filhas do <Tldraw> (dentro do contexto de UI:
 * botões, tooltips, selects e toasts nativos funcionam) e portadas para .reif-overlay.
 */
export function ReifOverlays() {
  const editor = useEditor()

  const handlePrompt = useCallback<PromptSubmitHandler>(
    async ({ prompt, payload, provider }) => {
      const ds = currentDesignSystem()
      const fileIds = payload.nodes.filter((n) => n.type === 'file').map((n) => n.id as TLShapeId)
      const attachments = fileIds.length ? await attachmentsFor(editor, fileIds) : []
      const { plan, warnings } = await requestTransform({
        prompt,
        provider,
        subgraph: payload,
        designSystem: ds.id,
        ...(attachments.length ? { attachments } : {}),
      })
      console.info('[reif] plan', plan, warnings)
      const { imageSlots } = applyPlan(editor, plan, payload, ds)
      const first = imageSlots[0] ? editor.getShape(imageSlots[0]) : undefined
      if (first?.type === IMAGE_SLOT_SHAPE) openImagePicker({ query: first.props.query, slotId: first.id })
      return warnings
    },
    [editor],
  )

  return (
    <Overlay>
      <AIPromptBar onSubmit={handlePrompt} />
      <InsertPopover />
      <ReaderPanel />
      <ImagePicker />
    </Overlay>
  )
}
