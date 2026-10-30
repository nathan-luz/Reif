---
name: notes-to-diagram
description: Turn the user's selected canvas content (sticky notes, texts, shapes, file cards, documents, video transcripts) into a diagram, or extend an existing diagram, on the Reif tldraw canvas. Use whenever the selection is not empty and the request is to organize, structure, summarize visually, map, connect, expand or reorganize what is selected.
---

# From selected notes to a diagram

The selection JSON is the **source of truth**. The goal is the NotebookLM experience — an overview grounded in the user's own material — but with editable, native shapes and better structures (concept maps, flows, comparisons) when the content calls for them.

## 1. Read before structuring

- Read every selected node's `text`, and the attached documents when present. Notice what is already there:
  - existing arrows (`edges`)
  - frames
  - the language
  - the level of detail
- Classify the content using diagram-core section 3:
  - a set of facts on one topic → mind map
  - mechanisms → concept map
  - steps → flow
  - two or more alternatives → columns
  - dated events → timeline

## 2. Grounding rules

- Every new node must be supported by the selection or documents. Do **not** invent facts, numbers or citations.
- You may name grouping categories that are implicit in the content: themes, stages, criteria.
- Keep the user's terminology and language. Shorten to keywords, but don't paraphrase technical terms away.
- If the material is too thin for the requested diagram, build what is supported. Say in `summary` what is missing, as a question the user could answer ("Add notes on X to complete the branch Y").

## 3. Transform vs. complement

- "Transform into / reorganize / turn these notes into…" means **replace** them:
  - Put their ids in `delete`.
  - Rebuild them as the new structure.
  - The engine reuses their area.
- "Make a map of / summarize / connect…" means **keep** the originals and create the diagram next to them. The engine places it to the right of the selection.
- Add arrows between existing notes without moving them: use `connect` with existing ids, `layout.type: "free"` and an empty `create`.
- Adjusting a few existing nodes: use `update` (text/color/x/y) only for ids in the selection.

## 4. Expanding one node

When exactly one node is selected and the user asks to expand, detail, break down, or "go deeper":

1. Set `layout.root` = that node's **id**, and `layout.type` = `mindmap` (or `tree` for part–whole and classification).
2. Create ≤ 5 children, connected from that id, in reading order. Add grandchildren only if they are explicitly requested.
3. Don't delete or recreate the selected node. The engine keeps it fixed and grows the branch around it.

## 5. Long documents (PDF, book, transcript)

- First pass: an **overview map**. The root is the document's subject, level 1 holds 4–6 main themes (not the table of contents), and each theme gets 2–4 key ideas.
- Order themes by the document's argument (problem → method → results → implications) or by chronology.
- Put precise facts the user will want to recall (definitions, numbers, formulas) as leaf keywords, or in short notes attached to their theme.
- In `summary`, offer the next step, e.g. "select a theme and ask to expand it". Progressive disclosure beats a 60-node wall.

## 6. Active-learning options (when the user is studying)

- **Skeleton:** keep 30–50% of the leaves empty or "?" for self-testing.
- **Questions:** attach a `note` with 1 recall question to each level-1 theme ("Why does the light phase need water?").
- **Connections:** after a map exists, propose cross-links between branches as dashed arrows with verb labels. That integration is where understanding shows.
