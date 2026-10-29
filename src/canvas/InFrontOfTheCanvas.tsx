import { useCallback } from 'react'
import { useEditor, type TLShapeId } from 'tldraw'
import { requestTransform } from './ai/client'
import { ReaderPanel } from '../files/reader/ReaderPanel'
import { ImagePicker } from './image-picker/ImagePicker'
import { Notices } from './notify/Notices'
import { Overlay } from './Overlay'
import { openImagePicker } from './image-picker/state'
import { applyPlan } from './mutations/apply'
import { IMAGE_SLOT_SHAPE } from '../shapes/image-slot/types'
import { currentDesignSystem } from '../design-system/state'
import { attachmentsFor } from '../files/ai'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

export function InFrontOfTheCanvas() {
  const editor = useEditor()

  const handlePrompt = useCallback<PromptSubmitHandler>(
    async ({ prompt, payload, provider }) => {
      const ds = currentDesignSystem()
      const attachments = payload.nodes.some((n) => n.type === 'file')
        ? await attachmentsFor(editor, payload.nodes.filter((n) => n.type === 'file').map((n) => n.id as TLShapeId))
        : []
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
    <>
      <AIPromptBar onSubmit={handlePrompt} />
      <Overlay>
        <ImagePicker />
        <ReaderPanel />
        <Notices />
      </Overlay>
    </>
  )
}
