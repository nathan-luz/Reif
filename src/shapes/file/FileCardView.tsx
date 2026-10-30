import { memo } from 'react'
import { derivedKey } from '../../files/blob'
import { formatBytes, KIND_ICON, KIND_LABEL } from '../../files/kinds'
import { useDerivedValue, useThumbUrl } from '../../files/useDerived'
import { ReifIcon } from '../../ui/ReifIcon'
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
        <div className="flex h-full items-center justify-center text-tl-text-3">
          <ReifIcon name={KIND_ICON[kind]} style={{ width: 40, height: 40, opacity: 0.6 }} />
        </div>
      )
    ) : kind === 'sheet' && excerpt ? (
      <table className="w-full table-fixed border-collapse font-mono text-[10px] text-tl-text-1">
        <tbody>
          {excerpt.split('\n').map((line, r) => (
            <tr key={r} className={r === 0 ? 'font-semibold' : ''}>
              {line.split('\t').map((c, i) => (
                <td key={i} className="truncate border-b border-tl-divider px-2 py-1">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p
        className={`h-full overflow-hidden px-3 pt-2 text-[11px] leading-snug whitespace-pre-wrap text-tl-text-1 ${
          kind === 'code' || kind === 'bib' || kind === 'sheet' ? 'font-mono' : ''
        }`}
      >
        {excerpt || (status === 'analyzing' ? '' : '—')}
      </p>
    )

  return (
    <div
      className="reif-card select-none"
      data-testid="file-card"
      data-kind={kind}
      data-status={status}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-tl-divider px-2.5">
        <ReifIcon name={KIND_ICON[kind]} small />
        <span className="min-w-0 flex-1 truncate font-semibold text-tl-text-0" title={name}>
          {title || name}
        </span>
        <span className="reif-chip" data-tone="muted">{KIND_LABEL[kind]}</span>
      </div>
      <div className="relative min-h-0 flex-1 bg-tl-low">
        {body}
        <FileActions shape={shape} />
      </div>
      <div className="reif-meta flex h-7 shrink-0 items-center justify-between gap-2 border-t border-tl-divider px-2.5">
        <span className="truncate" data-testid="file-stats">
          {status === 'analyzing' ? <span className="reif-pulse">Analisando…</span> : stats}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {status === 'remote' ? (
            <>
              <ReifIcon name="reif-link" small style={{ width: 12, height: 12 }} />
              link
            </>
          ) : (
            formatBytes(size)
          )}
        </span>
      </div>
    </div>
  )
})
