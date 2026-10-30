import { DESIGN_SYSTEMS } from '../shared/design-systems'

const pt: Record<string, string> = {
  'tool.media': 'Inserir',
  'action.insert-media': 'Enviar arquivo…',
  'reif.design-system': 'Design system',
  ...Object.fromEntries(DESIGN_SYSTEMS.map((ds) => [`reif.ds.${ds.id}`, ds.name])),
  'color-style.ds-primary': 'Primária (design system)',
  'color-style.ds-secondary': 'Secundária (design system)',
  'color-style.ds-accent': 'Destaque (design system)',
  'color-style.ds-muted': 'Neutra (design system)',
  'color-style.ds-ink': 'Tinta (design system)',
}

/** Mesmas chaves em todos os locales que o tldraw pode escolher. */
export const translations = { en: pt, 'pt-br': pt, pt }
