---
name: compare-classify
description: Build comparison, classification and hierarchy diagrams on the Reif tldraw canvas — side-by-side columns, comparison matrices, pros/cons, taxonomies, org charts, part-whole trees and card grids. Use for compare/comparar, "X vs Y", diferenças, semelhanças, prós e contras, tipos de, classificação, taxonomia, estrutura, partes de, organograma, glossary/flashcard grids.
---

# Compare and classify

## Side-by-side comparison (2–4 items)

- `layout: { "type": "columns" }`.
- Create one `frame` per item, with the item's name as `text` and role `container`.
- Inside each frame, give every attribute one `geo` `rectangle` (`"frame": "<frame ref>"`) holding the **value**: "2 divisions" vs "1 division".
- **Parallel order is essential.** Row i in every column must answer the same attribute. Each column gets the same number of cards, in the same order.
- Start each value with the attribute when it isn't obvious ("Daughter cells: 4"), or add a first column frame named "Criterion" that holds the attribute names.
- Use role `primary` for item A, `secondary` for item B (and `muted` for a third). Use role `accent` for the single most important difference.
- 3–7 attributes, chosen as the ones that *discriminate* the items. Skip attributes where all items are identical, or put them in one shared note below ("Both: …").
- Add a title `text` (role `title`), e.g. "Mitosis × Meiosis".

## Pros and cons / for and against

- Use `columns` with two frames, "Pros" and "Cons" (or the user's terms), each holding 3–6 short cards.
- Use role `primary` for pros and `highlight` for cons.
- Add a third frame "Verdict" or "When to use" only if the user asks for a conclusion.

## Comparison matrix (many items × attributes) or card grid

- `layout: { "type": "grid", "columns": <number of attributes + 1> }`.
- Emit the cells row by row:
  - first the header row (`geo`, role `primary`; don't use title or heading `text` here, because those are lifted above the diagram);
  - then each item: its name (role `secondary`), followed by its values (role `body` geo).
- Keep cells to ≤ 4 words.
- For glossary or flashcard grids, give each card a `geo` with `"Term\nshort definition (≤ 12 words)"`, and set `columns` to 3–4.

## Classification / taxonomy / part–whole

- `layout: { "type": "tree", "direction": "down", "root": "<root ref>" }`.
  - Use `"direction": "right"` when labels are long or there are more than 6 leaves on one level.
- Root: the class or the whole, `geo`, role `accent`.
- Categories: `geo`, role `primary`. Each level must use **one classification criterion**. Put the criterion as a `label` on the edges, or in the category text, when it helps (e.g. "by cell type").
- Leaves (examples, members, parts): `text` role `body`. Use no boxes for leaves; the engine draws the orthogonal connectors.
- Categories must be mutually exclusive and jointly exhaustive.
- ≤ 6 children per node and ≤ 3 levels.

## Venn-like overlap

tldraw has no reliable overlapping-circle layout. Model "A only / both / B only" as `columns` with three frames: "Only A", "Both", "Only B". It reads better and stays editable.
