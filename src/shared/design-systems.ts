/**
 * Design systems ("skins") para o conteúdo GERADO por prompt.
 * Dados puros: compartilhado entre o canvas (aplica estilos) e o Worker (descreve ao LLM).
 */

export const DS_COLORS = ['ds-primary', 'ds-secondary', 'ds-accent', 'ds-muted', 'ds-ink'] as const
export type DsColor = (typeof DS_COLORS)[number]

/** Papéis semânticos que o LLM atribui; o design system decide a aparência. */
export const STYLE_ROLES = [
  'title', 'heading', 'body', 'primary', 'secondary', 'accent', 'muted', 'container', 'connector', 'highlight',
] as const
export type StyleRole = (typeof STYLE_ROLES)[number]

export type DsFont = 'draw' | 'sans' | 'serif' | 'mono'
export type DsFill = 'none' | 'semi' | 'solid' | 'pattern' | 'lined-fill'
export type DsDash = 'draw' | 'solid' | 'dashed' | 'dotted'
export type DsSize = 's' | 'm' | 'l' | 'xl'

export interface RoleStyle {
  color: DsColor
  fill: DsFill
  dash: DsDash
  size: DsSize
  font: DsFont
}

export interface DsPalette {
  /** Cor do whiteboard. */
  background: string
  colors: Record<DsColor, string>
}

export interface DesignSystem {
  id: string
  name: string
  /** Uma frase para o LLM (tom visual). */
  description: string
  light: DsPalette
  dark: DsPalette
  roles: Record<StyleRole, RoleStyle>
  /** Espaçamento preferido entre nós (px) e dica de composição para o LLM. */
  layout: { gap: number; hint: string }
}

type RoleOverrides = Partial<Record<StyleRole, Partial<RoleStyle>>>

/** Papéis base; cada design system sobrescreve só o que muda. */
function roles(base: Pick<RoleStyle, 'font' | 'dash'>, overrides: RoleOverrides = {}): Record<StyleRole, RoleStyle> {
  const r = (color: DsColor, fill: DsFill, size: DsSize, extra: Partial<RoleStyle> = {}): RoleStyle => ({
    color, fill, size, ...base, ...extra,
  })
  const defaults: Record<StyleRole, RoleStyle> = {
    title: r('ds-ink', 'none', 'xl'),
    heading: r('ds-ink', 'none', 'l'),
    body: r('ds-ink', 'none', 'm'),
    primary: r('ds-primary', 'semi', 'm'),
    secondary: r('ds-secondary', 'semi', 'm'),
    accent: r('ds-accent', 'solid', 'm'),
    muted: r('ds-muted', 'none', 's'),
    container: r('ds-muted', 'none', 'm', { dash: 'dashed' }),
    connector: r('ds-ink', 'none', 'm'),
    highlight: r('ds-accent', 'semi', 'm'),
  }
  return Object.fromEntries(
    Object.entries(defaults).map(([k, v]) => [k, { ...v, ...overrides[k as StyleRole] }]),
  ) as Record<StyleRole, RoleStyle>
}

export const DESIGN_SYSTEMS: readonly DesignSystem[] = [
  {
    id: 'classic',
    name: 'Clássico',
    description: 'Hand-drawn, warm and friendly sketch style.',
    light: {
      background: '#f9fafb',
      colors: { 'ds-primary': '#4465e9', 'ds-secondary': '#ae3ec9', 'ds-accent': '#f76707', 'ds-muted': '#9fa8b2', 'ds-ink': '#1d1d1d' },
    },
    dark: {
      background: '#101011',
      colors: { 'ds-primary': '#4f72fc', 'ds-secondary': '#c77cff', 'ds-accent': '#f37c2e', 'ds-muted': '#828a94', 'ds-ink': '#f2f2f2' },
    },
    roles: roles({ font: 'draw', dash: 'draw' }),
    layout: { gap: 60, hint: 'organic, slightly loose layouts are fine' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, monochrome with a single blue accent; crisp solid lines and sans-serif type.',
    light: {
      background: '#ffffff',
      colors: { 'ds-primary': '#111827', 'ds-secondary': '#6b7280', 'ds-accent': '#2563eb', 'ds-muted': '#d1d5db', 'ds-ink': '#111827' },
    },
    dark: {
      background: '#0f0f10',
      colors: { 'ds-primary': '#e5e7eb', 'ds-secondary': '#9ca3af', 'ds-accent': '#60a5fa', 'ds-muted': '#4b5563', 'ds-ink': '#f3f4f6' },
    },
    roles: roles(
      { font: 'sans', dash: 'solid' },
      { primary: { fill: 'none' }, secondary: { fill: 'none' }, accent: { fill: 'semi' }, container: { dash: 'solid' } },
    ),
    layout: { gap: 48, hint: 'strict grid alignment, generous whitespace, few colors' },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    description: 'Technical blueprint: light lines on deep blue, monospace labels, dashed construction lines.',
    light: {
      background: '#0b2a5b',
      colors: { 'ds-primary': '#e0f2fe', 'ds-secondary': '#93c5fd', 'ds-accent': '#fbbf24', 'ds-muted': '#60a5fa', 'ds-ink': '#f8fafc' },
    },
    dark: {
      background: '#06173a',
      colors: { 'ds-primary': '#e0f2fe', 'ds-secondary': '#93c5fd', 'ds-accent': '#fbbf24', 'ds-muted': '#3b82f6', 'ds-ink': '#f8fafc' },
    },
    roles: roles(
      { font: 'mono', dash: 'solid' },
      {
        primary: { fill: 'none' },
        secondary: { fill: 'none', dash: 'dashed' },
        accent: { fill: 'pattern' },
        highlight: { fill: 'pattern' },
        connector: { dash: 'dashed' },
      },
    ),
    layout: { gap: 56, hint: 'orthogonal, engineering-diagram layouts aligned to a grid' },
  },
  {
    id: 'notebook',
    name: 'Caderno',
    description: 'Warm paper notebook: sepia ink, serif type, dotted containers and hatched highlights.',
    light: {
      background: '#f5efe0',
      colors: { 'ds-primary': '#8b5e34', 'ds-secondary': '#556b2f', 'ds-accent': '#c2410c', 'ds-muted': '#a8a29e', 'ds-ink': '#3f3a33' },
    },
    dark: {
      background: '#2b2620',
      colors: { 'ds-primary': '#d6a26b', 'ds-secondary': '#a3b86c', 'ds-accent': '#fb923c', 'ds-muted': '#78716c', 'ds-ink': '#ede6d6' },
    },
    roles: roles(
      { font: 'serif', dash: 'solid' },
      { container: { dash: 'dotted' }, highlight: { fill: 'lined-fill' }, accent: { fill: 'pattern' } },
    ),
    layout: { gap: 56, hint: 'study-notes feel: titles on top, content flowing in columns' },
  },
]

export const DEFAULT_DESIGN_SYSTEM_ID = 'classic'

export function getDesignSystem(id: string | null | undefined): DesignSystem {
  return DESIGN_SYSTEMS.find((d) => d.id === id) ?? (DESIGN_SYSTEMS[0] as DesignSystem)
}

/** Default por tipo quando o LLM não informa papel. */
export function defaultRoleFor(kind: string, size?: string): StyleRole {
  switch (kind) {
    case 'text':
      return size === 'xl' || size === 'l' ? 'title' : 'body'
    case 'frame':
      return 'container'
    case 'line':
    case 'draw':
    case 'arrow':
      return 'connector'
    case 'note':
      return 'secondary'
    default:
      return 'primary'
  }
}

/** Trecho do prompt de sistema descrevendo o design system ativo. */
export function describeForLLM(ds: DesignSystem): string {
  return `Active design system: "${ds.name}" — ${ds.description}
Layout: ${ds.layout.hint}; use ~${ds.layout.gap}px gaps.
Styling: set "role" on every created node (${STYLE_ROLES.join(', ')}) and OMIT color/fill/dash/size,
so the design system styles it. Set explicit color/fill/dash/size ONLY if the user explicitly asks for them.`
}
