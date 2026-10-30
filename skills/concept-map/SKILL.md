---
name: concept-map
description: Build Novak-style concept maps (concepts linked by labeled propositions, with cross-links) on the Reif tldraw canvas. Use when the user asks for a concept map, mapa conceitual, "how X relates to Y", "explain the relationships", mechanisms, or wants to understand rather than just list a topic.
---

# Concept map

A concept map is a **network of propositions**. Each `concept → linking phrase → concept` triple reads as a true sentence ("Chlorophyll — absorbs → light"). It is the diagram with the strongest learning evidence (Nesbit & Adesope 2006; Schroeder et al. 2018), and it beats a mind map whenever the question is *why* or *how*.

## Method (Novak & Cañas)

1. **Focus question.** Phrase what the map answers, e.g. "How do plants obtain energy?", and use it as the title (`text`, role `title`).
2. **Concept list.** Gather 10–25 concepts (aim for 12–18 in one generation).
   - Concepts are nouns or short noun phrases (1–3 words).
   - Rank them from most general to most specific.
   - Drop anything that doesn't serve the focus question.
3. **Hierarchy.** The most general concept goes at the top as role `accent`. Specificity grows downward, because the `flow` layout puts arrow sources above their targets.
4. **Propositions.** Connect concepts with labeled arrows.
   - **Every edge has a `label`**: a 1–3 word verb phrase ("produces", "is stored in", "requires", "is a type of", "increases").
   - Read each triple aloud. If it is not a correct sentence, fix the label or the direction.
5. **Cross-links.** Add 1–3 links between *different branches* that reveal integration, e.g. "Respiration — consumes → Oxygen".
   - Mark them `dashed: true`.
   - These are what make a concept map more than a tree.
6. **Examples.** Specific examples ("e.g. glucose") go in `text` nodes with role `muted` at the bottom, connected with the label "e.g." / "ex.:".

## Plan recipe

- `layout: { "type": "flow", "direction": "down" }`
  - Use `"right"` only for long horizontal chains.
- Nodes:
  - `geo` `rectangle`
  - role `accent` (top concept, exactly one), `primary` (general), `secondary` (specific)
  - `text` role `muted` for examples
- `connect`: all edges have `label` and point from the more general or causal concept to the more specific or resulting one.
  - `arrow` defaults to `"end"`.
  - Use `"both"` only for true mutual relations.
- Avoid **linear string maps** (A→B→C→D…). They signal shallow understanding. Show branching and cross-links.
- Keep 1–3 edges per concept on average. A concept with 6+ edges should be split into sub-concepts.

## Checklist

- [ ] Every edge label is a verb phrase and every triple reads as a correct sentence.
- [ ] One concept, one node. Point to the existing node instead of duplicating it.
- [ ] 1–3 dashed cross-links between branches.
- [ ] No sentences inside boxes.
- [ ] The title states the focus question.
