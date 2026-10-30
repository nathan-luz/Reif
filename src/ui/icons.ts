/**
 * Ícones do Reif no mesmo idioma visual do tldraw:
 * grade 30×30, traço de 2px, pontas e junções arredondadas, contorno (sem preenchimento),
 * desenhados em preto — o tldraw os usa como MÁSCARA, então a cor vem de `currentColor`.
 * Registrados em `assetUrls.icons` (UI) e usados por <ReifIcon> (canvas, sem contexto de UI).
 */
const S = 'fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><g ${S}>${body}</g></svg>`
const filled = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">${body}</svg>`

const page = 'M8 4h9l6 6v15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'

export const REIF_ICONS = {
  // ações
  'reif-upload': svg('<path d="M15 19V5"/><path d="M9.5 10.5 15 5l5.5 5.5"/><path d="M5 19v6h20v-6"/>'),
  'reif-image-search': svg('<path d="M24 12V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h7"/><path d="m5 19 5-5 4 4"/><circle cx="11" cy="10.5" r="1.5"/><circle cx="20.5" cy="19.5" r="4"/><path d="m23.5 22.5 3 3"/>'),
  'reif-search': svg('<circle cx="13" cy="13" r="7.5"/><path d="m18.5 18.5 6.5 6.5"/>'),
  'reif-mic': svg('<rect x="11" y="4" width="8" height="14" rx="4"/><path d="M7 14a8 8 0 0 0 16 0"/><path d="M15 22v4"/><path d="M11 26h8"/>'),
  'reif-link': svg('<path d="M13 17a4.5 4.5 0 0 0 6.4 0l4-4a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3"/><path d="M17 13a4.5 4.5 0 0 0-6.4 0l-4 4a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3"/>'),
  'reif-sparkle': svg('<path d="M13 4c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M22 18c.3 2.2 1.1 3 3.3 3.3-2.2.3-3 1.1-3.3 3.3-.3-2.2-1.1-3-3.3-3.3 2.2-.3 3-1.1 3.3-3.3z"/>'),
  'reif-send': svg('<path d="M15 24V6"/><path d="m8 13 7-7 7 7"/>'),
  'reif-transcript': svg('<path d="M5 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H12l-5 4v-4a2 2 0 0 1-2-2z"/><path d="M10 10h10"/><path d="M10 14h6"/>'),
  'reif-play': filled('<path d="M10 7.2v15.6a1 1 0 0 0 1.5.86l12.6-7.8a1 1 0 0 0 0-1.72L11.5 6.34A1 1 0 0 0 10 7.2z"/>'),
  'reif-pause': filled('<rect x="8" y="6" width="5" height="18" rx="1.5"/><rect x="17" y="6" width="5" height="18" rx="1.5"/>'),
  'reif-stop': filled('<rect x="8" y="8" width="14" height="14" rx="2.5"/>'),
  'reif-record': filled('<circle cx="15" cy="15" r="7"/>'),
  // tipos de arquivo
  'reif-file': svg(`<path d="${page}"/><path d="M17 4v6h6"/>`),
  'reif-file-text': svg(`<path d="${page}"/><path d="M17 4v6h6"/><path d="M11 15h8"/><path d="M11 19h8"/><path d="M11 11h2"/>`),
  'reif-file-pdf': svg(`<path d="${page}"/><path d="M17 4v6h6"/><rect x="10" y="15" width="10" height="6" rx="1"/>`),
  'reif-book': svg('<path d="M6 6.5A1.5 1.5 0 0 1 7.5 5H24v17H7.5A1.5 1.5 0 0 0 6 23.5z"/><path d="M6 23.5A1.5 1.5 0 0 0 7.5 25H24v-3"/><path d="M11 10h8"/>'),
  'reif-slides': svg('<rect x="4" y="5" width="22" height="15" rx="1"/><path d="M15 20v5"/><path d="M10 25h10"/><path d="M9 10h7"/><path d="M9 14h12"/>'),
  'reif-table': svg('<rect x="5" y="6" width="20" height="18" rx="1"/><path d="M5 12h20"/><path d="M5 18h20"/><path d="M12 6v18"/>'),
  'reif-globe': svg('<circle cx="15" cy="15" r="10"/><path d="M5 15h20"/><path d="M15 5c2.8 3 4 6.5 4 10s-1.2 7-4 10c-2.8-3-4-6.5-4-10s1.2-7 4-10z"/>'),
  'reif-notebook': svg('<rect x="8" y="4" width="16" height="22" rx="1"/><path d="M5 9h5"/><path d="M5 15h5"/><path d="M5 21h5"/><path d="M13 10h7"/>'),
  'reif-code': svg('<path d="m10 9-6 6 6 6"/><path d="m20 9 6 6-6 6"/><path d="m17 6-4 18"/>'),
  'reif-quote': svg('<path d="M6 22c3-1.2 5-3.8 5-7.5V9H6v6h5"/><path d="M17 22c3-1.2 5-3.8 5-7.5V9h-5v6h5"/>'),
  'reif-audio': svg('<path d="M5 13v4"/><path d="M9.5 9v12"/><path d="M14 5v20"/><path d="M18.5 10v10"/><path d="M23 13v4"/>'),
  'reif-video': svg('<rect x="4" y="7" width="22" height="16" rx="2"/><path d="m13 11.5 5 3.5-5 3.5z"/>'),
  'reif-image': svg('<rect x="5" y="5" width="20" height="20" rx="1"/><circle cx="11" cy="11" r="2"/><path d="m5 21 6-6 4 4 3-3 7 7"/>'),
  'reif-download': svg('<path d="M15 5v14"/><path d="M9.5 13.5 15 19l5.5-5.5"/><path d="M5 19v6h20v-6"/>'),
} as const

export type ReifIconName = keyof typeof REIF_ICONS

const toDataUrl = (s: string) => `data:image/svg+xml,${encodeURIComponent(s)}`

export const REIF_ICON_URLS: Record<ReifIconName, string> = Object.fromEntries(
  Object.entries(REIF_ICONS).map(([k, v]) => [k, toDataUrl(v)]),
) as Record<ReifIconName, string>

/** Passado ao <Tldraw assetUrls>: os nomes `reif-*` passam a valer em qualquer TldrawUiIcon/ferramenta. */
export const reifAssetUrls = { icons: REIF_ICON_URLS }
