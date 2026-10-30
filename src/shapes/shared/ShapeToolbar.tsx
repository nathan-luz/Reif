import type { ReactNode } from 'react'
import { stopEventPropagation } from 'tldraw'
import type { ReifIconName } from '../../ui/icons'
import { ReifIcon } from '../../ui/ReifIcon'

export interface ShapeAction {
  id: string
  icon: ReifIconName
  label: string
  onRun: () => void
  testId?: string
}

/**
 * Barra contextual de um shape do Reif (padrão "contextual bar" do DESIGN_SYSTEM.md):
 * painel com sombra 2 e botões `.tlui-button` de 32px — a mesma anatomia da barra
 * de estilos do tldraw. Mostra um rótulo de progresso no lugar das ações enquanto roda.
 */
export function ShapeToolbar({ actions, running, className = 'top-2 right-2' }: { actions: ShapeAction[]; running?: ReactNode; className?: string }) {
  return (
    <div className={`reif-shape-toolbar reif-enter absolute z-10 ${className}`} onPointerDown={stopEventPropagation} role="toolbar">
      {running ? (
        <span className="reif-pulse flex h-8 items-center gap-1.5 px-2.5 text-tl-text-1" role="status">
          <ReifIcon name="reif-sparkle" small />
          {running}
        </span>
      ) : (
        actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className="tlui-button tlui-button__normal"
            onClick={(e) => {
              e.stopPropagation()
              a.onRun()
            }}
            data-testid={a.testId}
          >
            <ReifIcon name={a.icon} small />
            <span className="tlui-button__label">{a.label}</span>
          </button>
        ))
      )}
    </div>
  )
}

/** Erro de uma ação do shape: mesma superfície, texto em `danger`. */
export function ShapeError({ message, className = 'inset-x-2 bottom-2', testId }: { message: string; className?: string; testId?: string }) {
  return (
    <div className={`reif-shape-toolbar reif-enter absolute z-10 px-2.5 py-1.5 text-tl-danger ${className}`} title={message} role="alert" data-testid={testId}>
      <span className="line-clamp-2 text-[12px]">{message}</span>
    </div>
  )
}
