# Diagramas por prompt

How Reif turns a prompt (or selected notes) into a study diagram. The guiding idea comes from the research and from the Excalidraw skills we studied: **the LLM decides the structure, code decides the geometry.** LLMs are bad at coordinates (overlaps, labels spilling out of boxes, arrows cutting through shapes), so we don't ask them for coordinates.

```
prompt + seleção ─▶ Worker: system prompt = regras + design system + SKILLS (por intenção)
                 ─▶ LLM (Gemini/Claude, structured output) ─▶ plano: create/connect + layout{type,root,…}
                 ─▶ canvas: mede textos (métricas do tldraw) ─▶ layout determinístico ─▶ shapes tldraw
```

## 1. Skills (`skills/*/SKILL.md`)

Written in the Claude Skills format (frontmatter `name`/`description` plus the body), so they also work outside Reif.

| Skill | When it is used |
|---|---|
| `diagram-core` | always: method, choice of diagram by type of relation, budgets, visual vocabulary, checklist |
| `mind-map` | mind maps and overviews (Buzan / Gemini Notebook) |
| `concept-map` | Novak concept maps: propositions, linking phrases, cross-links |
| `process-flow` | flowcharts, decisions, cycles, timelines, cause → effect, fishbone |
| `compare-classify` | comparison columns, matrices, pros and cons, taxonomies |
| `charts` | bar, line, scatter, pie and function charts (`free` layout) |
| `notes-to-diagram` | selected content: grounding, transform vs. complement, expanding a node |

`worker/skills.ts` picks which skills to load from keywords in the prompt (pt/en, accent-insensitive). `diagram-core` is always loaded. When nothing matches, all the study skills are loaded. When something is selected, `notes-to-diagram` is added.

## 2. Plan (`src/shared/mutations.ts`)

- `design`: 1–3 sentences of reasoning before the plan. This is a plan-then-render step; DiagrammerGPT found that planning carries most of the accuracy.
- `layout.type`: `free | mindmap | tree | flow | radial | cycle | timeline | columns | grid`. Optional fields: `root`, `direction` (`down`/`right`), `columns`, `branchColors`.
- `connect`: the **order** of the list is the reading order. Optional fields: `label` (linking phrase), `arrow` (`end`/`none`/`both`) and `dashed` (weak relation or cross-link, which doesn't define sequence).
- The JSON Schema must avoid `minimum`/`maximum`/`minLength`/…, because Claude's structured outputs reject them. A test in `mutations.test.ts` checks this.

## 3. Layout engine (`src/canvas/mutations/`)

- `measure.ts` computes each node's size from its text, using tldraw's `textMeasure` with the font and size of the active design system's role. The maximum text width depends on the role, and the box grows for diamond, ellipse and cloud shapes, whose usable text area is smaller.
- `layout.ts` holds pure, tested functions:
  - `tree`: tidy tree (Reingold–Tilford, simplified)
  - `mindmap`: two sides balanced by subtree height, with aligned columns
  - `flow`: dagre / Sugiyama, with route points
  - `radial`: rings, with angular slices proportional to leaf counts
  - `cycle`: clockwise circle, annotations pushed outward
  - `timeline`: alternates above and below an axis
  - `columns`: aligned rows
  - `grid`
  - Shared rules: titles go above the diagram, unconnected nodes go below it, and frames wrap their children.
- `arrange.ts` places the computed block:
  - next to the selection;
  - in the area of the replaced nodes;
  - centered in the viewport;
  - or around an **existing root**, which stays fixed, for "expand this idea".

  In `free` layout it only separates overlapping boxes and lifts titles that collide with content.
- `apply.ts` creates the arrows according to the layout:
  - orthogonal with edge anchors in trees and mind maps;
  - curved along the dagre route for long or labeled edges in flows;
  - curved outward in cycles;
  - in timelines, the axis plus markers.

  With `branchColors`, each first-level branch gets one color, inherited by its descendants and its edges.

## 4. Real evaluation

The skills were evaluated with real Gemini and Claude output on 10 prompts: mind map, concept map, flowchart, timeline, comparison, Krebs cycle, chart, notes → diagram, expanding a node, and a generic request. The plans went through the same pipeline (sanitize → layout → render), and every diagram layout came out with 0 overlaps. Use this procedure for new skills:

1. Build the requests with `buildSystemPrompt`/`buildUserMessage`.
2. Call the APIs with the same schema.
3. Pass the results through `stripEmptyOptionals` → `LLMPlanSchema` → `sanitizePlan`.
4. Render them with Playwright, mocking `/api/transform`.
5. Look at the screenshots and count overlaps.

## References

- Excalidraw skills studied:
  - coleam00/excalidraw-diagram-skill: "diagrams argue", isomorphism, visual patterns, render–validate loop
  - edwingao28/excalidraw-toolkit: self-critique with a geometric check, spacing for labeled edges
  - yctimlin/mcp_excalidraw: anti-patterns, sizing rules, describe + screenshot
- Novak & Cañas (concept maps). Nesbit & Adesope 2006; Schroeder et al. 2018 (effect sizes for concept maps).
- Buzan, Eppler 2006 (mind map vs. concept map). Mayer (coherence, signaling, spatial contiguity). Cowan 2001 (about 4 chunks).
- tldraw agent starter kit (sizing rules and review checklist). DiagrammerGPT. AutomaTikZ. Eraser (ELK, model hints).
- Gemini Notebook / NotebookLM mind maps.
