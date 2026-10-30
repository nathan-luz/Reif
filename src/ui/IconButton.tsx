import { TldrawUiButton, TldrawUiButtonIcon } from 'tldraw'
import type { ReifIconName } from './icons'

type IconName = ReifIconName | 'cross-2' | 'check' | 'download' | 'external-link' | 'chevron-left' | 'chevron-right' | 'link' | 'code'

interface Props {
  icon: IconName
  /** Também vira o tooltip e o aria-label (sempre obrigatório: botão só-ícone). */
  label: string
  onClick?: () => void
  disabled?: boolean
  isActive?: boolean
  small?: boolean
  type?: 'icon' | 'tool'
  'data-testid'?: string
}

/** Botão só-ícone do SDK (hover, foco, tooltip e tamanhos nativos). Requer contexto de UI do tldraw. */
export function IconButton({ icon, label, onClick, disabled, isActive, small, type = 'icon', ...rest }: Props) {
  return (
    <TldrawUiButton
      type={type}
      tooltip={label}
      aria-label={label}
      onClick={onClick}
      disabled={Boolean(disabled)}
      isActive={Boolean(isActive)}
      data-testid={rest['data-testid']}
    >
      <TldrawUiButtonIcon icon={icon} small={Boolean(small)} />
    </TldrawUiButton>
  )
}
