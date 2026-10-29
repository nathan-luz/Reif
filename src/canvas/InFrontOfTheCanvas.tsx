import { useCallback } from 'react'
import { useEditor } from 'tldraw'
import { requestTransform } from './ai/client'
import { applyPlan } from './mutations/apply'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

export function InFrontOfTheCanvas() {
  const editor = useEditor()

  const handlePrompt = useCallback<PromptSubmitHandler>(
    async ({ prompt, payload, provider }) => {
      const { plan, warnings } = await requestTransform({ prompt, provider, subgraph: payload })
      console.info('[reif] plan', plan, warnings)
      applyPlan(editor, plan, payload)
      return warnings
    },
    [editor],
  )

  return <AIPromptBar onSubmit={handlePrompt} />
}
