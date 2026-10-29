import type { Editor, JsonObject, TLShape, TLShapePartial } from 'tldraw'
import type { DesignSystem, StyleRole } from '../shared/design-systems'
import { STYLE_ROLES } from '../shared/design-systems'

/** Props de estilo que o design system controla. */
export const STYLE_PROPS = ['color', 'labelColor', 'fill', 'dash', 'size', 'font'] as const
export type StyleProp = (typeof STYLE_PROPS)[number]

/** Quais props de estilo cada tipo de shape possui. */
const PROPS_BY_TYPE: Record<string, readonly StyleProp[]> = {
  note: ['color', 'size', 'font'],
  text: ['color', 'size', 'font'],
  geo: ['color', 'labelColor', 'fill', 'dash', 'size', 'font'],
  frame: ['color'],
  line: ['color', 'dash', 'size'],
  draw: ['color', 'fill', 'dash', 'size'],
  arrow: ['color', 'labelColor', 'fill', 'dash', 'size', 'font'],
}

/** Props de estilo suportadas por um tipo de shape. */
export const allowedStyleProps = (type: string): readonly StyleProp[] => PROPS_BY_TYPE[type] ?? []

export interface ReifMeta {
  generated: true
  role: StyleRole
  /** Props que o usuário (ou o LLM, explicitamente) definiu: o re-skin não toca. */
  overrides: StyleProp[]
}

export function readReifMeta(shape: TLShape): ReifMeta | null {
  const m = (shape.meta as { reif?: Partial<ReifMeta> }).reif
  if (!m?.generated || !m.role || !(STYLE_ROLES as readonly string[]).includes(m.role)) return null
  return { generated: true, role: m.role, overrides: Array.isArray(m.overrides) ? m.overrides : [] }
}

export const reifMeta = (role: StyleRole, overrides: StyleProp[] = []): JsonObject => ({
  reif: { generated: true, role, overrides },
})

/** Props de estilo do papel, filtradas pelo que o tipo suporta e sem as sobrescritas. */
export function roleProps(
  ds: DesignSystem,
  role: StyleRole,
  type: string,
  skip: readonly string[] = [],
): Partial<Record<StyleProp, string>> {
  // Rótulos sempre na "tinta" do design system (legíveis sobre o fundo dele).
  const style: Record<StyleProp, string> = { ...ds.roles[role], labelColor: 'ds-ink' }
  const allowed = PROPS_BY_TYPE[type] ?? []
  return Object.fromEntries(allowed.filter((p) => !skip.includes(p)).map((p) => [p, style[p]]))
}

/**
 * Re-skin: reaplica o design system aos shapes gerados (cores ds-* já mudam via tema;
 * aqui entram fill/dash/size/font). Respeita overrides. Uma transação, fora do histórico.
 */
export function reskin(editor: Editor, ds: DesignSystem) {
  const updates: TLShapePartial[] = []
  for (const shape of editor.getCurrentPageShapes()) {
    const meta = readReifMeta(shape)
    if (!meta) continue
    const props = roleProps(ds, meta.role, shape.type, meta.overrides)
    const current = shape.props as Record<string, unknown>
    if (Object.entries(props).some(([k, v]) => current[k] !== v)) {
      updates.push({ id: shape.id, type: shape.type, props } as TLShapePartial)
    }
  }
  if (updates.length) {
    withSystemWrite(() => editor.run(() => editor.updateShapes(updates), { history: 'ignore' }))
  }
}

// ── Escritas do sistema vs. do usuário ────────────────────────────────────
let systemWriting = 0

/** Mudanças feitas aqui dentro não contam como override manual. */
export function withSystemWrite<T>(fn: () => T): T {
  systemWriting++
  try {
    return fn()
  } finally {
    systemWriting--
  }
}

/**
 * Quando o usuário muda o estilo de um shape gerado, marca a prop como override
 * para o re-skin não desfazer a escolha dele.
 */
export function trackManualOverrides(editor: Editor): () => void {
  return editor.sideEffects.registerAfterChangeHandler('shape', (prev, next) => {
    if (systemWriting > 0) return
    const meta = readReifMeta(next)
    if (!meta) return
    const a = prev.props as Record<string, unknown>
    const b = next.props as Record<string, unknown>
    const changed = STYLE_PROPS.filter((p) => p in b && a[p] !== b[p] && !meta.overrides.includes(p))
    if (!changed.length) return
    withSystemWrite(() =>
      editor.updateShape({
        id: next.id,
        type: next.type,
        meta: { ...next.meta, ...reifMeta(meta.role, [...meta.overrides, ...changed]) },
      }),
    )
  })
}
