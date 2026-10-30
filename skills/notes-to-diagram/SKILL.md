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

## 4. Expanding a node inside an existing diagram (regeneration)

Use this when one node is selected and the user asks to add, expand, detail, break down, list contents, or "go deeper". Instructions like "add the main contents of this subject" are short on purpose.

1. **Read the board context first.** Interpret the request in the frame of the diagram's central topic and the path to the node. Example: path "ENEM subjects → Natural Sciences → Biology" plus "add the main contents of this subject" means the Biology topics **most tested in ENEM**, not a generic biology syllabus. Name the content the way that context names it (exam topics, chapter themes, the course's terms).
2. **Grow only that node.** Set `layout.root` = the selected node's **id**, and `layout.type` = the existing diagram's layout (`mindmap` or `tree`). Connect every new node from that id, or from another new node, in reading order. Never recreate, rename, or delete the selected node or its neighbours. The engine re-lays out the whole diagram around the new nodes, keeps every branch on its side, and moves the neighbours to make room.
3. **Match the visual level.** New nodes are one level deeper than the selected node, so they must look subordinate:
   - Children of a `text` leaf are `text` nodes with role `body` (grandchildren role `muted`).
   - Children of a `geo` branch are `geo` nodes with role `secondary`, or `text` with role `body`.
   - Don't set colors. New nodes inherit the branch color automatically.
4. **Budget.** Use 4–7 children. Add at most one more level (2–3 items each) only when it carries real information, e.g. examples or sub-topics an exam really asks for. Keep to ≤ 20 new nodes in total, with keyword labels of ≤ 4 words.
5. **Don't duplicate** the node's existing children listed in the context. Complement them.
6. In `summary`, say what was added in the user's language, and suggest the next node to expand.

## 5. Long documents (PDF, book, transcript)

- First pass: an **overview map**. The root is the document's subject, level 1 holds 4–6 main themes (not the table of contents), and each theme gets 2–4 key ideas.
- Order themes by the document's argument (problem → method → results → implications) or by chronology.
- Put precise facts the user will want to recall (definitions, numbers, formulas) as leaf keywords, or in short notes attached to their theme.
- In `summary`, offer the next step, e.g. "select a theme and ask to expand it". Progressive disclosure beats a 60-node wall.

## 6. Active-learning options (when the user is studying)

- **Skeleton:** keep 30–50% of the leaves empty or "?" for self-testing.
- **Questions:** attach a `note` with 1 recall question to each level-1 theme ("Why does the light phase need water?").
- **Connections:** after a map exists, propose cross-links between branches as dashed arrows with verb labels. That integration is where understanding shows.
