import { AIPromptBar, type PromptSubmitHandler } from './prompt-bar/AIPromptBar'

// Placeholder até a Fase 3 (pipeline de IA no Worker).
const handlePrompt: PromptSubmitHandler = (prompt, payload) => {
  console.info('[reif] prompt', { prompt, payload })
}

export function InFrontOfTheCanvas() {
  return <AIPromptBar onSubmit={handlePrompt} />
}
