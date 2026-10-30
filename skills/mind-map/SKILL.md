---
name: mind-map
description: Build effective mind maps (Buzan / NotebookLM style overviews) on the Reif tldraw canvas. Use when the user asks for a mind map, mapa mental, overview, summary map, brainstorm, "organize the topic", or an overview of selected notes or documents.
---

# Mind map

A mind map is a **radial tree of keywords** around one central topic. It is good for an overview, for note-taking, for recall cues and for brainstorming. It is the wrong tool for explaining *how or why* things relate; use a concept map for that. Gemini Notebook (NotebookLM) mind maps work the same way: the root is the source's topic, level 1 holds the main themes, deeper levels hold sub-ideas, and labels are short noun phrases.

## Structure

- **Root:** one node, 1–3 words, the subject itself (not "Mind map of…").
  - `geo` `ellipse`, role `accent`.
  - Set `layout.root` to its ref.
- **Level 1:** 3–7 main themes, ideally 4–6.
  - `geo` `rectangle`, role `primary`.
  - Themes must be **mutually exclusive** and should together cover the subject (MECE).
  - Use the content's own logic (stages, causes, components), not the order of the document's headings, when a better grouping exists.
- **Level 2:** 2–5 children per theme.
  - Use free `text` nodes with role `body` (keywords sit on the branch line, as Buzan recommends), or `geo` role `secondary` when a level 3 follows.
- **Level 3 (optional):** only where it carries real value, ≤ 4 children, `text` role `body` or `muted`.
- Total **15–30 nodes**. Past that, stop at level 2 and say in `summary` which branches can be expanded.
- One idea per node. **Keywords, not sentences:** 1–4 words, no articles. Use formulas, numbers, dates and proper names where they help: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" is a good leaf.

## Plan recipe

- `layout: { "type": "mindmap", "root": "<root ref>", "branchColors": true }`
  - Leave `branchColors` off only if the user asks for a sober or monochrome look.
- `connect` contains exactly one edge from each parent to each child, listed in reading order:
  - Theme 1 and its children, then theme 2 and its children, and so on.
  - Branches fill clockwise from the top-right.
  - Use no `label` and no `arrow` field; the engine draws plain branch lines.
- Optional: 1–2 **associations** between distant branches, marked `dashed: true`, `arrow: "end"`, with a short `label`. Use them only when they reveal something important.
- Add a title only if the root alone would be ambiguous: a `text` with role `title` and no connections.

## Variations

- **Expand a node** (a node is selected and the user says "expand", "detail this", "go deeper"):
  - Set `layout.root` = the **existing node's id**.
  - Create only its new children: **≤ 5** per expansion, the way Whimsical and NotebookLM do it.
  - Connect them from that id. Do not recreate or delete the root.
- **Skeleton map** for active study ("for me to complete", "practice", "fill in"):
  - Generate the root plus 4–6 themes and 1–2 examples each.
  - Add empty `geo` nodes or "?" leaves for the learner to fill in.
  - Building or extending a map teaches more than studying a ready one (g≈0.72 vs 0.43).
- **From selected notes:** follow the notes-to-diagram skill.
  - Every node must come from the notes.
  - Delete the originals only if the user asked to *transform* them.

## Anti-patterns

- Paragraphs inside nodes. Split them, or attach a `note`.
- Five or more levels deep, or 10+ children on one node. Regroup.
- Generic branches like "Introduction", "Conclusion" or "Other".
- The same concept appearing on two branches. Keep one node and use a dashed association.
- A flat list disguised as a mind map (root plus 15 leaves). Find the intermediate categories.
