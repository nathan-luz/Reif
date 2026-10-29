import { memo } from 'react'
import { derivedKey } from '../../files/blob'
import { formatBytes, KIND_ICON, KIND_LABEL } from '../../files/kinds'
import { useDerivedValue, useThumbUrl } from '../../files/useDerived'
import { AudioPlayer } from './AudioPlayer'
import { FileActions } from './FileActions'
import type { FileShape } from './types'

const THUMB_KINDS = new Set(['pdf', 'epub', 'slides', 'video'])

/** Cartão leve: nada pesado é montado aqui — só thumb/trecho/onda já calculados. */
export const FileCardView = memo(function FileCardView({ shape }: { shape: FileShape }) {
  const { kind, name, size, status, stats, excerpt, title, hasThumb } = shape.props
  const key = derivedKey(shape)
  const thumb = useThumbUrl(key, hasThumb && THUMB_KINDS.has(kind))
  const peaks = useDerivedValue<number[]>(key, 'peaks', kind === 'audio' && status !== 'analyzing')

  const body =
    kind === 'audio' ? (
      status === 'analyzing' ? null : <AudioPlayer shape={shape} peaks={peaks} />
    ) : THUMB_KINDS.has(kind) ? (
      thumb ? (
        <img src={thumb} alt="" draggable={false} className="h-full w-full object-contain object-top" />
      ) : (
        <div className="flex h-full items-center justify-center text-5xl opacity-40">{KIND_ICON[kind]}</div>
      )
    ) : kind === 'sheet' && excerpt ? (
      <table className="w-full table-fixed border-collapse font-mono text-[10px] text-[var(--tl-color-text-1)]">
        <tbody>
          {excerpt.split('\n').map((line, r) => (
            <tr key={r} className={r === 0 ? 'font-semibold' : ''}>
              {line.split('\t').map((c, i) => (
                <td key={i} className="truncate border-b border-[var(--tl-color-muted-2)] px-2 py-1">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p
        className={`h-full overflow-hidden px-3 pt-2 text-[11px] leading-snug whitespace-pre-wrap text-[var(--tl-color-text-1)] ${
          kind === 'code' || kind === 'bib' || kind === 'sheet' ? 'font-mono' : ''
        }`}
      >
        {excerpt || (status === 'analyzing' ? '' : '—')}
      </p>
    )

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--tl-color-muted-2)] bg-[var(--tl-color-panel)] shadow-sm select-none"
      data-testid="file-card"
      data-kind={kind}
      data-status={status}
    >
      <div className="flex items-center gap-2 border-b border-[var(--tl-color-muted-2)] px-3 py-2">
        <span aria-hidden>{KIND_ICON[kind]}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--tl-color-text-1)]" title={name}>
          {title || name}
        </span>
        <span className="text-[10px] tracking-wide text-[var(--tl-color-text-3)] uppercase">{KIND_LABEL[kind]}</span>
      </div>
      <div className="relative min-h-0 flex-1 bg-[var(--tl-color-low)]">
        {body}
        <FileActions shape={shape} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] text-[var(--tl-color-text-3)]">
        <span className="truncate" data-testid="file-stats">
          {status === 'analyzing' ? 'Analisando…' : stats}
        </span>
        <span className="shrink-0">{status === 'remote' ? '🔗 link' : formatBytes(size)}</span>
      </div>
    </div>
  )
})
