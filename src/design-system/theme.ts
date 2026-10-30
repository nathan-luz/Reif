import { DEFAULT_THEME, type TLDefaultColor, type TLTheme, type TLThemeFont, type TLThemeFonts } from 'tldraw'
import patrickHand from '@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff2?url'
import patrickHandExt from '@fontsource/patrick-hand/files/patrick-hand-latin-ext-400-normal.woff2?url'
import caveatBold from '@fontsource/caveat/files/caveat-latin-700-normal.woff2?url'
import caveatBoldExt from '@fontsource/caveat/files/caveat-latin-ext-700-normal.woff2?url'
import { DS_COLORS, type DesignSystem, type DsPalette } from '../shared/design-systems'
import { luminance, mix, readableOn, toDisplayP3 } from './color'

// Cores do design system entram na paleta do tldraw (registradas a partir do tema).
declare module 'tldraw' {
  /** Fontes manuscritas do Reif (registradas como valores do estilo "font"). */
  export interface TLThemeFonts {
    hand: TLThemeFont
    script: TLThemeFont
  }
  export interface TLThemeDefaultColors {
    'ds-primary': TLDefaultColor
    'ds-secondary': TLDefaultColor
    'ds-accent': TLDefaultColor
    'ds-muted': TLDefaultColor
    'ds-ink': TLDefaultColor
  }
}

/** Deriva todas as variantes que o tldraw usa a partir de uma cor base e do fundo. */
export function deriveColor(base: string, background: string, semiMix = 0.82): TLDefaultColor {
  const dark = luminance(background) < 0.2
  const noteFill = dark ? mix(base, '#000000', 0.45) : mix(base, '#ffffff', 0.55)
  const highlight = dark ? mix(base, '#000000', 0.2) : mix(base, '#ffffff', 0.35)
  return {
    solid: base,
    semi: mix(base, background, semiMix),
    pattern: mix(base, background, 0.35),
    fill: base,
    linedFill: mix(base, background, 0.5),
    frameHeadingStroke: mix(base, background, 0.5),
    frameHeadingFill: mix(base, background, 0.88),
    frameStroke: mix(base, background, 0.5),
    frameFill: mix(base, background, 0.95),
    frameText: base,
    noteFill,
    noteText: readableOn(noteFill),
    highlightSrgb: highlight,
    highlightP3: toDisplayP3(highlight),
  }
}

function paletteColors(p: DsPalette, pastel?: number) {
  return Object.fromEntries(DS_COLORS.map((c) => [c, deriveColor(p.colors[c], p.background, pastel ?? 0.82)])) as Record<
    (typeof DS_COLORS)[number],
    TLDefaultColor
  >
}

/** Letra de forma manuscrita (corpo) e cursiva (títulos), licença OFL. */
export const REIF_FONTS: Pick<TLThemeFonts, 'hand' | 'script'> = {
  hand: {
    fontFamily: "'Patrick Hand', 'tldraw_draw', sans-serif",
    faces: [
      { family: 'Patrick Hand', src: { url: patrickHand, format: 'woff2' }, weight: 'normal', style: 'normal' },
      { family: 'Patrick Hand', src: { url: patrickHandExt, format: 'woff2' }, weight: 'normal', style: 'normal', unicodeRange: 'U+0100-024F, U+1E00-1EFF' },
    ],
  },
  script: {
    fontFamily: "'Caveat', 'tldraw_draw', cursive",
    faces: [
      { family: 'Caveat', src: { url: caveatBold, format: 'woff2' }, weight: 'normal', style: 'normal' },
      { family: 'Caveat', src: { url: caveatBoldExt, format: 'woff2' }, weight: 'normal', style: 'normal', unicodeRange: 'U+0100-024F, U+1E00-1EFF' },
    ],
  },
}

/** Reforça o "semi" das cores padrão do tldraw (pílulas e cartões pastel visíveis). */
function pastelize<T extends object>(colors: T, background: string, pastel?: number): T {
  if (pastel === undefined) return colors
  return Object.fromEntries(
    Object.entries(colors).map(([k, v]) =>
      v && typeof v === 'object' && 'solid' in v ? [k, { ...v, semi: mix((v as TLDefaultColor).solid, background, pastel) }] : [k, v],
    ),
  ) as T
}

const isDarkBackground = (hex: string) => luminance(hex) < 0.2

/**
 * Tema = paleta padrão do tldraw no "tom" do fundo + cores ds-* + fundo do whiteboard.
 * Fundo escuro (ex.: Blueprint no modo claro) usa a paleta escura do tldraw, como o
 * próprio dark mode faz: "preto" é exibido claro. Nenhum shape é alterado — só a exibição.
 */
export function buildTheme(ds: DesignSystem, base: TLTheme = DEFAULT_THEME): TLTheme {
  const forMode = (p: DsPalette) => ({
    ...pastelize(isDarkBackground(p.background) ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light, p.background, ds.pastel),
    ...paletteColors(p, ds.pastel),
    background: p.background,
    negativeSpace: p.background,
    selectionFill: p.background,
  })
  return { ...base, fonts: { ...base.fonts, ...REIF_FONTS }, colors: { light: forMode(ds.light), dark: forMode(ds.dark) } }
}
