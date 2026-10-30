import type { Point } from '../../shared/mutations'

/**
 * Doodles: ícones do Lucide (ISC, traço 24×24) convertidos em traços à mão livre do tldraw.
 * Viram shapes "draw" nativos — editáveis, coloridos pelo design system e com o traço
 * irregular do próprio tldraw — agrupados num único objeto.
 */

type IconNode = [string, Record<string, string | number>][]

const loaders = import.meta.glob('/node_modules/lucide/dist/esm/icons/*.mjs', { import: 'default' }) as Record<
  string,
  () => Promise<IconNode>
>

const NAMES = Object.keys(loaders).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.mjs'.length))
const BY_NAME = new Map(NAMES.map((n) => [n, n]))
const SQUASHED = new Map(NAMES.map((n) => [n.replace(/-/g, ''), n]))

/** Sinônimos frequentes (LLMs, pt/en) → nome Lucide. */
const ALIASES: Record<string, string> = {
  bulb: 'lightbulb', idea: 'lightbulb', ideia: 'lightbulb', gear: 'settings', engrenagem: 'settings',
  magnifier: 'search', 'magnifying-glass': 'search', lupa: 'search', flask: 'flask-conical', beaker: 'flask-conical',
  checklist: 'list-checks', clipboard: 'clipboard-list', alvo: 'target', cerebro: 'brain', coracao: 'heart',
  estrela: 'star', livro: 'book-open', relogio: 'clock', dinheiro: 'banknote', money: 'banknote', warning: 'triangle-alert',
  alert: 'triangle-alert', person: 'user', people: 'users', chart: 'chart-column', graph: 'chart-line', trophy: 'trophy',
  dna: 'dna', atom: 'atom', leaf: 'leaf', plant: 'sprout', water: 'droplet', fire: 'flame', earth: 'earth', globe: 'earth',
  smile: 'face-grinning', happy: 'face-grinning', sorriso: 'face-grinning', frown: 'face-slightly-frowning', sad: 'face-slightly-frowning',
}

/** Resolve um nome dado pelo LLM para um ícone existente (ou null). */
export function resolveIconName(raw: string | undefined): string | null {
  if (!raw) return null
  const kebab = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
  return BY_NAME.get(kebab) ?? (ALIASES[kebab] ? BY_NAME.get(ALIASES[kebab]!) : undefined) ?? SQUASHED.get(kebab.replace(/-/g, '')) ?? null
}

export async function loadIcon(name: string): Promise<IconNode | null> {
  const loader = loaders[`/node_modules/lucide/dist/esm/icons/${name}.mjs`]
  return loader ? loader() : null
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Amostra cada elemento do ícone (path, circle, rect, line, ellipse, poly*) em pontos do
 * grid 24×24. Saltos dentro de um path (subcaminhos) quebram o traço.
 */
export function iconStrokes(node: IconNode, step = 0.6): Point[][] {
  if (typeof document === 'undefined') return []
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden'
  document.body.appendChild(svg)
  const strokes: Point[][] = []
  try {
    for (const [tag, attrs] of node) {
      const el = document.createElementNS(SVG_NS, tag) as SVGGeometryElement
      for (const [k, v] of Object.entries(attrs)) if (k !== 'key') el.setAttribute(k, String(v))
      svg.appendChild(el)
      if (typeof el.getTotalLength !== 'function') continue
      const len = el.getTotalLength()
      if (!len) continue
      const n = Math.max(2, Math.ceil(len / step))
      let current: Point[] = []
      let prev: Point | null = null
      for (let i = 0; i <= n; i++) {
        const p = el.getPointAtLength((len * i) / n)
        const pt = { x: p.x, y: p.y }
        if (prev && Math.hypot(pt.x - prev.x, pt.y - prev.y) > step * 3) {
          if (current.length > 1) strokes.push(current)
          current = []
        }
        current.push(pt)
        prev = pt
      }
      if (current.length > 1) strokes.push(current)
    }
  } finally {
    svg.remove()
  }
  return strokes
}

/** Carrega e converte os doodles de um plano (antes de aplicar: a aplicação é síncrona). */
/** Chave = nome como veio do plano (ou '' sem nome); ícone desconhecido vira "sparkles". */
export async function prepareDoodles(icons: (string | undefined)[]): Promise<Map<string, Point[][]>> {
  const out = new Map<string, Point[][]>()
  await Promise.all(
    [...new Set(icons.map((i) => i ?? ''))].map(async (raw) => {
      const node = await loadIcon(resolveIconName(raw) ?? 'sparkles').catch(() => null)
      if (node) out.set(raw, iconStrokes(node))
    }),
  )
  return out
}
