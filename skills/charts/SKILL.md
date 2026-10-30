---
name: charts
description: Draw data charts and quantitative graphics (bar, column, line, scatter, pie/donut, function plots, number lines, axes) as editable tldraw shapes on the Reif canvas. Use for gráfico, chart, plot, curva, histograma, "plot y = …", proporções, percentages, trends or any request that encodes numbers visually.
---

# Charts (free layout)

Charts are the one case where **you** compute coordinates: `layout: { "type": "free" }`. The engine keeps your positions. It only nudges top-level boxes apart if they overlap, so never overlap boxes on purpose.

## 1. Pick the chart from the question

| Question | Chart |
|---|---|
| compare amounts across categories | bars, sorted by value unless categories have a natural order |
| change over time / a function | line, using `line` with `points` (and `curved: true` for smooth functions) |
| relation between two variables | scatter: small `geo` `ellipse` dots, 10×10 |
| parts of a whole (≤ 5 parts) | horizontal **100% stacked bar** (preferred), or pie/donut via closed `draw` shapes |
| one value on a scale | number line |

Never use 3D effects or decoration. Label the data directly (values next to bars, names at line ends) instead of using a legend. Use 1 color for a single series. Highlight the one bar or point that matters with role `accent`, and give the rest `primary` or `muted`.

## 2. Plot frame

Choose a plot rectangle, e.g. origin O = (x0, y0) = (100, 500) for the bottom-left of the axes, width W = 600, height H = 360. The page y axis grows **downward**, so a value v maps to `y = y0 − (v − vmin) / (vmax − vmin) · H`.

- **Nice scale.** Choose vmax as a round number ≥ the data max (1, 2, 2.5 or 5 × 10ⁿ), with 4–6 ticks. Start bars at 0, always.
- **Axes:**
  - x axis: `line` from (x0, y0) to (x0+W, y0)
  - y axis: `line` from (x0, y0) to (x0, y0−H)
  - both role `connector`
- **Ticks:**
  - small `text` labels (role `muted`, size `s`) left of the y axis at each tick value, x ≈ x0 − 50
  - category names under the x axis, y ≈ y0 + 12
- **Gridlines (optional):** `line` role `muted`, `dash: "dotted"` (only if the user wants a precise reading).
- **Axis titles:** `text` role `body`, including the unit: "Temperature (°C)".
- **Chart title:** `text` role `heading` well above the plot (≥ 80 px above the highest label), stating the takeaway ("Sales doubled in Q3"), not just "Sales chart".

## 3. Marks

- **Bars.** One `geo` `rectangle` per value with **empty text**: a labeled box is widened to fit its label.
  - Bar width = slot × 0.6. Slot = W / n.
  - x = x0 + i·slot + slot·0.2, y = valueY, h = y0 − valueY.
  - Put the value in a separate `text` (size `s`) centered above the bar.
- **Line series.** One `line` with all `points` in data order (≤ 60). Add an end label (`text`) at the last point instead of a legend.
- **Function plot.** Sample 30–60 points across the domain and use `curved: true`. Draw asymptotes as dashed `line`s.
- **Pie/donut.** Use one `draw` per slice. Its points are the center plus the arc points, closing back to the center (8–40 points; repeat the first point at the end to close it so it can be filled).
  - Angles start at −90° (top) and go clockwise, in descending share.
  - Label slices with `text` placed outside the pie at the slice's mid-angle: "Name 42%".
- **Number line.** One horizontal `line` with tick `text` labels, plus `geo` `ellipse` dots (12×12) for the marked values.

## 4. Data honesty

- Use the numbers the user gave, or well-established figures. If you must assume or illustrate, say so in `summary` and in a `muted` note ("illustrative values").
- Make sure the shares of a whole add up to 100%.
- Always label units and the source if one was given.
