---
name: process-flow
description: Build flowcharts, decision trees, step-by-step processes, cycles and timelines on the Reif tldraw canvas. Use for fluxograma, flowchart, algorithm, procedure, "how does X work step by step", decision, ciclo/cycle (water, Krebs, cell cycle, PDCA), linha do tempo/timeline, chronology, history, stages or phases.
---

# Processes: flow, decision, cycle, timeline

Choose the form from what the sequence *is*:

| The sequence… | Form | `layout` |
|---|---|---|
| has steps and branches (if/else, cases) | flowchart / decision tree | `{ "type": "flow", "direction": "down" }` |
| is a long linear pipeline with few branches | horizontal flow | `{ "type": "flow", "direction": "right" }` |
| returns to its start (cycles, feedback loops) | cycle | `{ "type": "cycle", "root": "<center ref>" }` |
| is anchored in dates or eras | timeline | `{ "type": "timeline" }` (`"direction": "down"` for long event texts) |
| has causes and consequences around one event | cause → effect | `{ "type": "flow", "direction": "right" }` |

## Flowchart / decision tree

- Shapes carry meaning:
  - start/end: `geo` `ellipse`, role `secondary`
  - step: `rectangle`, role `primary`
  - decision: `diamond`, role `highlight`, phrased as a short question ending in "?"
  - key outcome: role `accent`
- Every decision has ≥ 2 outgoing edges with labels such as "yes/no", "sim/não" or the condition ("> 38 °C").
- Steps start with a verb: "Measure pH", "Filter the solution". Keep them to ≤ 6 words, and put detail in an attached `note`.
- Merge paths back instead of duplicating steps. A step appears once, and several arrows may point to it.
- At most ~15 boxes and at most 3–4 parallel paths. Split larger processes into stages and offer to expand one.
- Loops (back to an earlier step) are allowed. Give the returning edge a label ("retry", "if not converged").

## Cycle

- Create a central `geo` `ellipse` with the cycle's name (role `accent`) and set it as `layout.root`.
- Create 3–8 stages as `geo` `rectangle`, role `primary`, each labeled with a noun or verb phrase of ≤ 4 words.
- `connect` the stages in order **and close the loop**: last → first. Use no edges to the center. The engine places the stages clockwise from the top and curves the arrows outward.
- Inputs and outputs of a stage (e.g. "CO₂ released") go in `text` nodes with role `muted`, connected to that stage with `arrow: "none"` and `dashed: true`.

## Timeline

- Each event is one `geo` `rectangle` with text `"<date>\n<event, ≤ 5 words>"`, role `primary`.
- Make the single pivotal event role `accent`.
- Chain the events chronologically in `connect` (e1 → e2 → e3 …). The engine uses this chain only for the **order**, draws the time axis with markers itself, and alternates cards above and below the axis.
- 4–12 events. With more, group them into eras: one timeline of eras now, and offer to expand an era.
- Use real dates in a consistent format (years for history, durations or ordinals for procedures).

## Cause → effect

- Causes are on the left, the central event (role `accent`) is in the middle, and consequences are on the right.
- Edges go cause → event → effect with short verb labels ("triggers", "leads to"). Mark contributing but non-decisive causes `dashed`.
- For a problem with many categories of causes (fishbone/Ishikawa), use `tree` with `"direction": "right"`. The problem is the root and categories (e.g. Methods, Materials, People, Environment) are level 1. Each category is a role `primary` geo with 2–4 causes as `text`.
