import charts from '../skills/charts/SKILL.md?raw'
import compareClassify from '../skills/compare-classify/SKILL.md?raw'
import conceptMap from '../skills/concept-map/SKILL.md?raw'
import diagramCore from '../skills/diagram-core/SKILL.md?raw'
import mindMap from '../skills/mind-map/SKILL.md?raw'
import notesToDiagram from '../skills/notes-to-diagram/SKILL.md?raw'
import processFlow from '../skills/process-flow/SKILL.md?raw'
import type { TransformRequest } from '../src/shared/mutations'

/**
 * Skills de diagramação (formato SKILL.md, compatível com Claude Skills): instruções
 * especializadas injetadas no system prompt conforme a intenção do pedido.
 */
export interface Skill {
  name: string
  description: string
  body: string
}

export function parseSkill(raw: string): Skill {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw.replace(/\r\n/g, '\n'))
  const front = m?.[1] ?? ''
  const field = (k: string) => new RegExp(`^${k}:\\s*(.*)$`, 'm').exec(front)?.[1]?.trim() ?? ''
  return { name: field('name'), description: field('description'), body: (m?.[2] ?? raw).trim() }
}

export const SKILLS = {
  core: parseSkill(diagramCore),
  mindMap: parseSkill(mindMap),
  conceptMap: parseSkill(conceptMap),
  processFlow: parseSkill(processFlow),
  compareClassify: parseSkill(compareClassify),
  charts: parseSkill(charts),
  notes: parseSkill(notesToDiagram),
} as const

type TypeSkill = 'mindMap' | 'conceptMap' | 'processFlow' | 'compareClassify' | 'charts'

/** Gatilhos por intenção (pt/en/es), comparados sem acentos e em minúsculas. */
const TRIGGERS: Record<TypeSkill, RegExp> = {
  mindMap: /mapa mental|mind ?maps?|mindmap|visao geral|overview|panorama|brainstorm|resum[aoi]|summar|organiz|esquema|tema central|topicos/,
  conceptMap: /mapa conceitual|mapa de conceitos|concept ?maps?|relac(ao|oes|iona)|relat(e|ion)|conex|conect|connect|por ?que|why|como funciona|how does|mecanismo|mechanism|expli(que|car|cacao)|explain/,
  processFlow: /fluxo|flow ?chart|flowchart|fluxograma|passo a passo|passos|\betapas?\b|\bsteps?\b|processo|process|procedimento|procedure|algoritmo|algorithm|decis|decision|\bciclos?\b|\bcycles?\b|\bloop\b|linha do tempo|timeline|cronolog|chronolog|historia|history|\bfases?\b|estagios|stages|sequencia|sequence|causa|consequen|efeitos?|ishikawa|espinha de peixe|fishbone/,
  compareClassify: /compar|\bvs\.?\b|versus|diferen|semelhan|similar|pros e contras|pros and cons|vantagens|desvantagens|tipos de|types of|classifica|taxonom|categori|partes d|parts of|estrutura|structure|organograma|org chart|hierarqu|hierarch|matriz|matrix|tabela|\btable\b|glossario|glossary|flashcards?|cartoes/,
  charts: /grafico|graph of|chart|plot|curva|histograma|histogram|barras|bar chart|pizza|\bpie\b|rosca|donut|porcent|percent|proporc|funcao|function|y ?= |\beixos?\b|\baxis\b|\bdados\b|\bdata\b|reta numerica|number line|tendencia|trend/,
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Core sempre; skills de tipo pelos gatilhos (todas as de estudo se nenhum casar); notas quando há seleção. */
export function selectSkills(req: Pick<TransformRequest, 'prompt' | 'subgraph' | 'attachments'>): Skill[] {
  const text = normalize(req.prompt)
  const matched = (Object.keys(TRIGGERS) as TypeSkill[]).filter((k) => TRIGGERS[k].test(text))
  const types: TypeSkill[] = matched.length ? matched : ['mindMap', 'conceptMap', 'processFlow', 'compareClassify']
  const fromSelection = (req.subgraph.mode === 'selection' && req.subgraph.nodes.length > 0) || Boolean(req.attachments?.length)
  return [SKILLS.core, ...types.map((k) => SKILLS[k]), ...(fromSelection ? [SKILLS.notes] : [])]
}

export function renderSkills(skills: Skill[]): string {
  return skills.map((s) => `<skill name="${s.name}">\n${s.body}\n</skill>`).join('\n\n')
}
