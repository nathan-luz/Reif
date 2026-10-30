# Backlog

## Diagramas por prompt

### Busca de referência antes de gerar o diagrama
Status: a analisar · Registrado em 2026-10-30

Add an optional first stage to diagram generation: before building the plan, search the internet for an existing diagram of what was requested and use it as the reference.

1. **Extract** the reference diagram's concepts and links (nodes and relationships).
2. **Check** whether it covers everything the user asked for.
3. **Adjust** the concepts where needed: add what is missing, remove what is off-topic, fix labels.
4. **Generate** the diagram with the refined structure, using the current pipeline (skills → plan → deterministic layout).

Points to analyze:
- Where to search for diagrams: image search (Wikimedia, the sources we already use) or the model's own web search (Google Search in Gemini, web search in Claude).
- How to extract the concepts: a model with vision reading the diagram image, or text from the page around it.
- Cost and latency of the extra stage. Make it optional, e.g. a "pesquisar referência" toggle, or only for study diagrams.
- Cite the reference's source in the generated diagram.
- Licensing: use the reference only to extract structure, without copying the image.
