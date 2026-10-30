---
name: diagram-core
description: Core method for generating study diagrams, schemas, mind maps, charts and visual explanations on the Reif tldraw canvas from a prompt or from selected notes. Use for ANY request that creates visual structure; the specialized skills (mind-map, concept-map, process-flow, compare-classify, charts, notes-to-diagram) build on it.
---

# Diagram core (Reif · tldraw)

You do not draw pixels. You return a **mutation plan**: nodes (`create`), arrows (`connect`) and a **layout type**. The canvas measures every label with tldraw's own font metrics and computes the positions with deterministic algorithms: a tidy tree, a balanced mind map, layered graph layout (dagre), radial rings, cycle, timeline, columns or grid. Your job is to supply the **meaning and structure**. Geometry is the engine's job, except in `free` layout.

## 1. A diagram argues, it does not decorate

- **Isomorphism test.** If you erased all the text, the shape of the diagram should still show the idea: a hierarchy looks like a tree, a process is a line, a loop is a circle and a contrast is two parallel columns. If yours is a uniform grid of equal boxes, rethink it.
- **Education test.** A student should learn something concrete from it: real terms, real values, real examples, real dates. "Process → Output" teaches nothing.
- **Coherence.** Every node must earn its place. Decorative or tangential nodes measurably hurt learning (seductive details, d≈−0.3 to −0.5). No emoji, and no filler such as "Introduction" or "Other".

## 2. Turn the request into a focus question

Before choosing anything, restate the request as a question the diagram answers, for example "How does the light phase feed the Calvin cycle?". Use it, shortened, as the title (a `text` node, role `title`). Write your reasoning in `design` (1–3 short sentences): the knowledge structure, the chosen layout and why, and what is central.

## 3. Choose the diagram from the *relation* asked about

| The question is about… | Diagram | `layout.type` |
|---|---|---|
| overview / summary / "everything about X" / brainstorm | mind map | `mindmap` |
| what X is made of, kinds, classification, taxonomy, outline | hierarchy tree | `tree` (`down`, or `right` for long labels) |
| how or why ideas relate, mechanisms, "explain" | concept map with linking phrases | `flow` (labeled edges) |
| steps, procedure, algorithm, decision | flowchart / decision tree | `flow` |
| chronology, history, stages over time | timeline | `timeline` |
| something that repeats (cycles, loops, feedback) | cycle | `cycle` (root = cycle name in the center) |
| one central thing with many equal satellites (features, applications) | hub and spoke | `radial` |
| causes and effects of one event | cause → event → effects | `flow` (`right`) |
| compare / contrast 2–4 things, pros and cons, categories | side-by-side columns | `columns` (one frame per item) |
| many items × several attributes, glossary cards | grid of cards | `grid` |
| quantities, trends, proportions | chart | `free` (see the charts skill) |
| an illustration or sketch ("draw a cell") | drawing | `free` |

Default to the structure the content actually has; a mind map is not a universal answer. Use a mind map for an overview and a concept map for "why/how".

## 4. Budgets: what fits in working memory

- Level-1 branches or groups: **3–7, ideally 4–6**. More than 7 means you should regroup under intermediate categories.
- Children per node: **≤ 5–6**.
- Depth: **≤ 3 levels below the root** per generation. Deeper detail comes later, when the user asks to expand a node.
- Total nodes: **≤ 30** (mind map), **≤ 25** (concept map or flow), **≤ 12** (timeline or cycle).
- Node labels are **keywords, not sentences**: 1–4 words, at most ~25 characters for branches and ~40 for leaves. A sentence in a box means it should be split up.
- Edge labels are 1–3 words, usually a verb ("produces", "is part of", "inhibits").
- When the material exceeds these budgets, build the **overview** now and tell the user in `summary` which branch can be expanded next.

## 5. Visual vocabulary (tldraw kinds and roles)

- `geo` = a concept or step, with its text as the label. Shape carries meaning:
  - `rectangle`: concept, step or process
  - `ellipse`: start, end or central topic
  - `diamond`: decision or question
  - `cloud`: abstract or uncertain idea
  - `hexagon`: key mechanism
- `text` = a free-floating label: titles, leaf keywords in mind maps and trees, annotations. Default to free text and add a container only when the box has a purpose (the focal point, an arrow target, or shape meaning). Aim for ≤ 40% of the text to sit inside boxes in mind maps and trees.
- `note` = a sticky with a short sentence: examples, mnemonics, "remember that…" (≤ 15 words). Attach it to the node it explains with `connect` (`arrow: "none"`, `dashed: true`) so the layout places it beside that node.
- `frame` = a named group (columns, zones). Children set `"frame": "<ref>"`.
- `connect` = arrows bound to nodes. Never draw arrows with `line`.
  - `arrow: "none"` for hierarchy and association.
  - `"end"` for direction, cause or sequence.
  - `"both"` for mutual relations.
  - `dashed: true` for weak, indirect, optional or cross-links.
- **Roles, not colors.** Set `role` on every node and let the active design system style it:
  - `title`: focus question
  - `accent`: the single most important node (usually the root)
  - `primary`: main concepts or level 1
  - `secondary`: second level, alternatives
  - `body`: plain leaf text
  - `muted`: side notes, examples
  - `highlight`: decisions, warnings, key results
  - `container`: frames

  Give one `accent` per diagram. Hierarchy should be visible through scale and role, going from accent to primary to secondary to body.
- Set explicit `color`, `fill`, `dash` or `size` only if the user asks. For mind maps, set `layout.branchColors: true` instead: one color per branch, inherited, with a neutral root.

## 6. How the plan maps to the engine

- In every layout except `free`, the engine ignores your `x`/`y`/`w`/`h` for `geo`, `text`, `note`, `frame`, `image` and `youtube`. Set them to 0 and spend your effort on the structure.
- Placement is automatic:
  - next to the selection;
  - in the place of nodes you delete ("transform into…");
  - centered in the visible area when nothing is selected;
  - around an **existing** node when `layout.root` is that node's id ("expand this idea").
- The **order of `connect`** is the reading order: siblings appear in that order (clockwise from the top-right in mind maps). Order by the logic of the content (sequence, causality, importance), never alphabetically.
- Hierarchy layouts (`mindmap`, `tree`, `radial`) read the tree from `connect`, starting at `layout.root`. Connect each child to its parent exactly once. Extra cross-links are allowed; mark them `dashed`.
- `flow` uses arrow direction to build the layers: arrows go from cause to effect and from earlier to later.
- A `text` with role `title` that has no arrows is placed above the diagram automatically.
- Nodes with no arrows go in a row below the diagram. Connect everything that belongs to the structure.

## 7. Before you answer — self-check

1. Does the layout type match the relation type in the request?
2. Is there exactly one central or accent node, and does every other node connect into the structure?
3. Is each concept in exactly one node (no duplicates; point arrows at the existing node instead)?
4. Are all labels keywords within budget? Has detail moved into an attached `note` instead of the box?
5. Are the budgets for branches, children, depth and total nodes respected?
6. Is every node supported by the user's material or by well-established knowledge, with no invented facts?
7. Is all text in the user's language (or the language of the selected content)?
8. Does `summary` say what was built and what could be expanded next?
