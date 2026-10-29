import { DEFAULT_THEME, type TLDefaultColor, type TLTheme } from 'tldraw'
import { DS_COLORS, type DesignSystem, type DsPalette } from '../shared/design-systems'
import { luminance, mix, readableOn, toDisplayP3 } from './color'

// Cores do design system entram na paleta do tldraw (registradas a partir do tema).
declare module 'tldraw' {
  export interface TLThemeDefaultColors {
    'ds-primary': TLDefaultColor
    'ds-secondary': TLDefaultColor
    'ds-accent': TLDefaultColor
    'ds-muted': TLDefaultColor
    'ds-ink': TLDefaultColor
  }
}

/** Deriva todas as variantes que o tldraw usa a partir de uma cor base e do fundo. */
export function deriveColor(base: string, background: string): TLDefaultColor {
  const dark = luminance(background) < 0.2
  const noteFill = dark ? mix(base, '#000000', 0.45) : mix(base, '#ffffff', 0.55)
  const highlight = dark ? mix(base, '#000000', 0.2) : mix(base, '#ffffff', 0.35)
  return {
    solid: base,
    semi: mix(base, background, 0.82),
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

function paletteColors(p: DsPalette) {
  return Object.fromEntries(DS_COLORS.map((c) => [c, deriveColor(p.colors[c], p.background)])) as Record<
    (typeof DS_COLORS)[number],
    TLDefaultColor
  >
}

const isDarkBackground = (hex: string) => luminance(hex) < 0.2

/**
 * Tema = paleta padrão do tldraw no "tom" do fundo + cores ds-* + fundo do whiteboard.
 * Fundo escuro (ex.: Blueprint no modo claro) usa a paleta escura do tldraw, como o
 * próprio dark mode faz: "preto" é exibido claro. Nenhum shape é alterado — só a exibição.
 */
export function buildTheme(ds: DesignSystem, base: TLTheme = DEFAULT_THEME): TLTheme {
  const forMode = (p: DsPalette) => ({
    ...(isDarkBackground(p.background) ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light),
    ...paletteColors(p),
    background: p.background,
    negativeSpace: p.background,
    selectionFill: p.background,
  })
  return { ...base, colors: { light: forMode(ds.light), dark: forMode(ds.dark) } }
}
