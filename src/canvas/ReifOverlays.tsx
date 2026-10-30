import { useCallback } from 'react'
import { useEditor, type Editor, type TLShapeId } from 'tldraw'
import type { DesignSystem } from '../shared/design-systems'
import { generateIntoSlot, slotPrompt } from './image-gen/generate'
import { pointLeaderLines } from './image-gen/locate'
import { currentDesignSystem } from '../design-system/state'
import { attachmentsFor } from '../files/ai'
import { ReaderPanel } from '../files/reader/ReaderPanel'
import { IMAGE_SLOT_SHAPE, type ImageSlotShape } from '../shapes/image-slot/types'
import { requestTransform } from './ai/client'
import { ImagePicker } from './image-picker/ImagePicker'
import { openImagePicker } from './image-picker/state'
import { InsertPopover } from './insert/InsertPopover'
import { applyPlan } from './mutations/apply'
import { Overlay } from './Overlay'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

/** Até 3 gerações simultâneas; na ilustração rotulada, aponta as linhas-guia depois. */
async function generateAll(editor: Editor, slots: ImageSlotShape[], ds: DesignSystem, labeled: boolean) {
  const queue = [...slots]
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const imageId = await generateIntoSlot(editor, s.id, ds)
      if (imageId && labeled) await pointLeaderLines(editor, imageId, slotPrompt(s)).catch((e: unknown) => console.warn('[reif] locate', e))
    }
  }
  await Promise.all([worker(), worker(), worker()])
}

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
      const doodleIcons = plan.create.filter((c) => c.kind === 'doodle').map((c) => c.icon)
      const doodles = doodleIcons.length ? await (await import('./doodles/doodles')).prepareDoodles(doodleIcons) : undefined
      const { imageSlots } = applyPlan(editor, plan, payload, ds, doodles ? { doodles } : {})
      const slots = imageSlots.flatMap((id) => {
        const s = editor.getShape<ImageSlotShape>(id)
        return s?.type === IMAGE_SLOT_SHAPE ? [s] : []
      })
      // Ilustrações por IA: geradas em segundo plano (o diagrama já está no board).
      const toGenerate = slots.filter((s) => slotPrompt(s))
      if (toGenerate.length) void generateAll(editor, toGenerate, ds, plan.layout.type === 'labeled')
      else if (slots[0]) openImagePicker({ query: slots[0].props.query, slotId: slots[0].id })
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
