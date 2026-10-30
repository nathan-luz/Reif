---
name: study-sheet
description: Build hand-drawn style study visuals on the Reif tldraw canvas — one-page study sheets (sketchnote / visual summary posters with numbered pastel section cards, a hero illustration or title badge, doodles and a takeaway), labeled illustrations (anatomy/structure drawings with leader lines), and AI-generated illustrations. Use for folha de estudo, resumo visual, resumo de uma página, infográfico, pôster, sketchnote, caderno, à mão, handwritten, ilustração, desenho, anatomia, estrutura de, partes de, rotulado.
---

# Study sheets and labeled illustrations (hand-drawn notebook style)

This visual language comes from hand-made study posters: a cursive title, pastel section cards with numbered headers, small doodles next to the items, one illustration that anchors the page, and a closing takeaway. It works best with the **"Caderno à mão"** design system, but every design system can render it.

## 1. Pick the format

| The user wants… | Format | `layout` |
|---|---|---|
| a whole topic on one page ("resumo visual de X", "folha de estudo", "infográfico") | **study sheet** | `{ "type": "sheet", "root": "<hero ref>" }` |
| the parts of one object, organ, machine, structure or place ("partes do olho", "anatomia do rim") | **labeled illustration** | `{ "type": "labeled", "root": "<image ref>" }` |
| a single picture to illustrate a node or an idea | one `image` node next to it | (any) |

## 2. Study sheet — anatomy

- **Title.** A `text` node with role `title` (cursive in the notebook style), holding the subject in 1–4 words: "Sistema Digestório". Optionally add a second `text` with role `heading` as the subtitle or focus question ("Como o alimento vira nutriente").
- **Hero.** One node set as `layout.root` and placed at the top center, either:
  - an `image` with `generate` (the main illustration, 280–360 px), or
  - a `geo` badge (role `accent`) with the core idea in 2–5 words.
- **Sections.** Use 4–8 `frame` nodes in reading order. Each frame's `text` is the numbered header, "1. Introdução", "2. Órgãos principais", and so on. The engine draws each section as a dashed pastel card with a header pill, gives every section its own color, and arranges them in columns.
- **Section content.** Every child sets `"frame": "<section ref>"`, in reading order. Choose the content that suits the section:
  - Bullets: one `text` (role `body`) per item, starting with "• ". Keep each to ≤ 14 words, and use 2–5 bullets per section.
  - Numbered steps: `text` items like "① Ingestão — …".
  - A key fact or definition: a `geo` with role `highlight` (≤ 18 words).
  - A doodle: one `doodle` per section (64×64), placed before or after the bullets. Use one only when it adds a recognizable cue.
  - A small illustration: an `image` with `generate`, at most one per section and 160–220 px, only where a picture explains better than words.
  - An equation or chain: a `text` like "Alimento + Enzimas → Nutrientes".
- **Takeaway (footer).** Use 1–2 nodes outside any frame and not connected: a `geo` (role `accent`) with the closing message, e.g. "Coma bem · Digira bem · Viva bem", and optionally a `note` with a "Fun fact". The engine centers them under the sheet.
- **Budget.** 4–8 sections, ≤ 40 nodes in total, ≤ 3 generated images per sheet (the hero plus up to 2 in sections). Use `columns: 3` (the default for 5+ sections) or `2`.
- **No arrows** between sections. A sheet is read like a page, top to bottom and left to right, so `connect` is usually empty.

## 3. Labeled illustration — anatomy

- **Illustration.** The root is an `image` (`generate` describes the object in English, e.g. "cross-section of a human kidney showing cortex, medulla, renal pyramids, renal pelvis, ureter, renal artery and vein"). Make it 380–460 px.
- **Labels.** Create 4–10 parts.
  - Term: a `text` with role `heading` and 1–3 words ("Córtex").
  - Description: a `text` with role `body` and ≤ 14 words, connected FROM the term (`arrow: "none"`, `dashed: true`) so it stays under the term.
  - Leader line: `connect` from the term to the illustration. The engine draws a line with a dot touching the image, then uses vision to move the dot onto the actual part.
- **Order.** List the parts top to bottom. The first half goes on the left and the rest on the right.
- Add a title (role `title`) and, optionally, a footer `note` ("Curiosidade: …").
- **Accuracy.** If an exact diagram matters (medicine, engineering) and the generated drawing might be wrong, use a search `query` (e.g. "human kidney anatomy diagram wikimedia") instead of `generate`. Labels always stay as Reif text.

## 4. Generated images (`image` + `generate`)

- `generate` is the **subject only**, in English, concrete and visual: what object, what view (cross-section, side view, exploded view), and what must be visible. One subject per image.
- **Never ask for text, letters, labels or arrows inside the image.** All words are Reif shapes. The style (colored pencil, pastel, blueprint…) is added automatically from the design system, so don't describe it.
- Use them for heroes, anatomy and objects, scenes that make an abstract idea concrete (e.g. "a person climbing stairs of books"), or one image repeated in variations for comparison ("a femur bone with a spiral fracture", "… with a transverse fracture").
- If image generation is unavailable, use `query` (search) instead.

## 5. Doodles (`doodle` + `icon`)

Hand-drawn line icons, colored by the section. Give a Lucide icon name in kebab-case. Common ones:

- **Ideas and learning:** lightbulb, brain, book-open, graduation-cap, pencil, puzzle, target
- **Science:** flask-conical, microscope, atom, dna, magnet
- **Health:** heart-pulse, bone, pill, syringe, stethoscope, activity, apple, eye, ear
- **Nature:** leaf, sprout, tree-pine, flower, sun, moon, cloud, cloud-rain, snowflake, droplet, flame, mountain, earth
- **Data and logic:** chart-line, chart-column, chart-pie, trending-up, trending-down, calculator, sigma, percent, infinity, scale
- **Time:** clock, hourglass, timer, calendar
- **People:** users, user, baby, hand, thumbs-up, face-grinning
- **Status:** check, list-checks, clipboard-list, triangle-alert, circle-alert, info
- **Goals:** trophy, medal, crown, flag, rocket, zap, star, sparkles, heart
- **Society:** landmark, gavel, banknote, coins, briefcase, factory, building, house
- **Transport:** car, plane, ship, bike
- **Tech:** cpu, laptop, smartphone, lock, key, shield
- **Process and misc:** repeat, refresh-cw, recycle, compass, settings, search, megaphone, quote, music, palette

Rules:

- At most one doodle per section or label, beside the item it illustrates.
- Use the icon that a reader would recognize at a glance.
- No decorative clutter: never more than 8 doodles on a sheet.

## 6. Writing style (what makes these sheets readable)

- Headers are numbered and short: "3. Funções".
- Bullets are fragments, not paragraphs, and start with the key term: "Fígado — produz a bile".
- Highlight 1 key fact per section with a `highlight` card.
- Repeat the subject's real vocabulary (terms the exam or course uses) and give concrete examples.
- Write everything in the user's language. The language of the image prompts is always English.
