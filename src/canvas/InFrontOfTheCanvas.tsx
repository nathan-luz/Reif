import { useCallback } from 'react'
import { useEditor } from 'tldraw'
import { requestTransform } from './ai/client'
import { applyPlan } from './mutations/apply'
import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

export function InFrontOfTheCanvas() {
  const editor = useEditor()

  const handlePrompt = useCallback<PromptSubmitHandler>(
    async ({ prompt, payload, provider }) => {
      const plan = await requestTransform({ prompt, provider, subgraph: payload })
      console.info('[reif] plan', plan)
      applyPlan(editor, plan, payload)
    },
    [editor],
  )

  return <AIPromptBar onSubmit={handlePrompt} />
}
