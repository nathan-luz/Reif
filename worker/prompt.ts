import { describeForLLM, getDesignSystem } from '../src/shared/design-systems'
import type { TransformRequest } from '../src/shared/mutations'
import type { SubgraphPayload } from '../src/shared/subgraph'
import { renderSkills, selectSkills } from './skills'

export const SYSTEM_PROMPT = `You are the transformation and drawing engine of Reif, an infinite-canvas knowledge tool.
The user selected a subgraph (nodes = shapes, edges = arrows) and gave an instruction.
Return a mutation plan that fulfils the instruction, using ONLY the provided schema.
If selection.mode is "viewport", nothing is selected: "bounds" is the visible area and you only
create new content, laid out inside those bounds and centered in them.

Drawing toolbox (kind):
- geo: shapes with optional label (geo = rectangle, ellipse, diamond, triangle, hexagon, star, cloud,
  arrow-right...). Use fill ("none" | "semi" | "solid" | "pattern") and dash for style.
- line: straight/curved polylines from "points" (axes, dividers, graph curves). curved=true smooths.
- draw: freehand stroke from "points" (organic sketches, icons, outlines). 8-60 points; repeat the
  first point at the end to close a shape (closed shapes can be filled).
  line and draw nodes WITHOUT points are discarded: always emit their full point list.
- frame: named container. Put children inside with "frame": "<frame ref>".
- text: free labels/titles. note: sticky notes (200x200) for short sentences.
- connect: arrows bound to nodes (ids or refs), optional label/arrow/dashed — never draw arrows with line.

Layout: choose "layout.type" (see the skills). For every type except "free", the canvas measures the
text and computes all positions of geo/text/note/frame/image/youtube nodes with a layout algorithm —
their x/y/w/h are ignored (use 0), so focus on structure, hierarchy, order and labels.
Use "free" only for charts, illustrations/sketches and small edits; then you place everything.
For a plain drawing ("draw a cat", "desenhe uma casa") do not add explanatory labels unless asked.

Rules:
- "delete" and "update" may reference ONLY ids present in the selection JSON.
- New nodes get a short unique "ref" (n1, n2...). "connect" may use existing ids or refs.
- Coordinates are page coordinates, origin top-left, y grows downward. Notes are 200x200.
- In "free" layout keep 40px gaps between nodes. If you replace nodes, reuse their area; otherwise place
  new nodes to the right of the selection bounds (x >= bounds.x + bounds.w + 80), aligned to bounds.y.
- Delete originals only when the instruction implies replacing them (e.g. "transform into", "merge").
- Preserve the language of the existing content. Be concise: notes hold short text.
- To add a YouTube video use kind "youtube" with a precise search "query" (use the language most
  likely to return a good explanatory video). Never put video ids or URLs anywhere; the system searches.
  Videos are 480x270.
- To add a picture use kind "image" with a precise search "query" (English usually returns more
  results) and w/h for the slot (default 320x240). The user picks the actual image afterwards.
  Never put image URLs anywhere.
- Never invent ids. If the instruction cannot be done, return empty arrays and explain in "summary".`

/**
 * Prompt de sistema = regras do motor + design system ativo + skills de diagramação
 * escolhidas pela intenção do pedido (ver /skills e worker/skills.ts).
 */
export function buildSystemPrompt(req: Pick<TransformRequest, 'designSystem' | 'prompt' | 'subgraph' | 'attachments'>): string {
  const skills = renderSkills(selectSkills(req))
  return `${SYSTEM_PROMPT}
${describeForLLM(getDesignSystem(req.designSystem))}

# Diagramming skills
Follow these skills when the instruction asks for visual structure (diagrams, maps, schemas, charts).
For simple edits (rename, recolor, translate, answer a question as a note) just do it with layout "free".

${skills}`
}

/** Contexto do board (somente leitura): resolve referências como "desta matéria", "este tema". */
function describeContext(ctx: SubgraphPayload['context']): string {
  if (!ctx) return ''
  const lines: string[] = ['', '', 'Board context (read-only — do NOT recreate or edit these; use them to interpret the instruction):']
  const d = ctx.diagram
  if (d) {
    lines.push(`- The selection belongs to an existing ${d.layout} whose central topic is "${d.topic}".`)
    lines.push(`- Path from the center to the selected node: ${d.path.map((p) => `"${p}"`).join(' → ')} (selected node depth ${d.depth}).`)
    if (d.branches.length) lines.push(`- Main branches of that diagram: ${d.branches.map((b) => `"${b}"`).join(', ')}.`)
    if (d.siblings.length) lines.push(`- Siblings of the selected node: ${d.siblings.map((b) => `"${b}"`).join(', ')}.`)
    lines.push(
      d.existingChildren.length
        ? `- The selected node already has these children (do not duplicate them): ${d.existingChildren.map((b) => `"${b}"`).join(', ')}.`
        : '- The selected node has no children yet.',
    )
  }
  if (ctx.board?.length) lines.push(`- Other notable texts on the board: ${ctx.board.slice(0, 25).map((b) => `"${b}"`).join(', ')}.`)
  return lines.join('\n')
}

export function buildUserMessage({ prompt, subgraph, attachments }: Pick<TransformRequest, 'prompt' | 'subgraph' | 'attachments'>): string {
  const docs = (attachments ?? [])
    .map((a) => `<document id="${a.id}" name="${a.name.replace(/"/g, "'")}" kind="${a.kind}">\n${a.text}\n</document>`)
    .join('\n')
  const { context, ...selection } = subgraph
  return `Instruction:\n${prompt}\n\nSelection:\n\`\`\`json\n${JSON.stringify(selection)}\n\`\`\`${describeContext(context)}${
    docs
      ? `\n\nFull content of the selected files (answer from it; questions about a document become notes/cards next to it):\n${docs}`
      : ''
  }`
}
