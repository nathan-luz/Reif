import { useCallback } from 'react'
import { useEditor } from 'tldraw'
import { requestTransform } from './ai/client'
import { ImagePicker } from './image-picker/ImagePicker'
import { openImagePicker } from './image-picker/state'
import { applyPlan } from './mutations/apply'
import { IMAGE_SLOT_SHAPE } from '../shapes/image-slot/types'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

export function InFrontOfTheCanvas() {
  const editor = useEditor()

  const handlePrompt = useCallback<PromptSubmitHandler>(
    async ({ prompt, payload, provider }) => {
      const { plan, warnings } = await requestTransform({ prompt, provider, subgraph: payload })
      console.info('[reif] plan', plan, warnings)
      const { imageSlots } = applyPlan(editor, plan, payload)
      const first = imageSlots[0] ? editor.getShape(imageSlots[0]) : undefined
      if (first?.type === IMAGE_SLOT_SHAPE) openImagePicker({ query: first.props.query, slotId: first.id })
      return warnings
    },
    [editor],
  )

  return (
    <>
      <AIPromptBar onSubmit={handlePrompt} />
      <ImagePicker />
    </>
  )
}
