import type { CSSProperties } from 'react'
import { REIF_ICON_URLS, type ReifIconName } from './icons'

/**
 * Ícone fora do contexto de UI do tldraw (ex.: dentro de shapes no canvas).
 * Mesma técnica e classes do TldrawUiIcon: máscara SVG + `currentColor`, 18px (15px `small`).
 */
export function ReifIcon({ name, small, style, label }: { name: ReifIconName; small?: boolean; style?: CSSProperties; label?: string }) {
  const url = REIF_ICON_URLS[name]
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`tlui-icon${small ? ' tlui-icon__small' : ''}`}
      style={{ mask: `url("${url}") center 100% / 100% no-repeat`, WebkitMask: `url("${url}") center 100% / 100% no-repeat`, ...style }}
    />
  )
}
