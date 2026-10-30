import { TldrawUiButton, TldrawUiButtonLabel } from 'tldraw'
import { useMemo, useState, type UIEvent } from 'react'
import type { Cell, SheetModel } from '../office/sheetModel'
import type { ReaderProps } from './types'
import { useModel } from './useModel'

const ROW_H = 28
const COL_W = 160
const OVERSCAN = 12

const fmt = (c: Cell) => (c === null ? '' : String(c))

/** Grade virtualizada: só as linhas visíveis existem no DOM (aguenta dezenas de milhares). */
export default function SheetReader({ shape, blob }: ReaderProps) {
  const { model, error } = useModel<SheetModel>(shape, blob)
  const [tab, setTab] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(600)
  const sheet = model?.sheets[tab]

  const window_ = useMemo(() => {
    if (!sheet) return { start: 0, end: 0 }
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
    const end = Math.min(sheet.rows.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN)
    return { start, end }
  }, [sheet, scrollTop, viewH])

  if (error) return <p className="p-4 text-tl-danger">{error}</p>
  if (!model || !sheet) return <p className="reif-meta reif-pulse p-4">Lendo planilha…</p>

  const width = 56 + sheet.columns.length * COL_W
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
    setViewH(e.currentTarget.clientHeight)
  }

  return (
    <div className="flex h-full flex-col" data-testid="sheet-reader">
      {model.sheets.length > 1 && (
        <div role="tablist" className="flex shrink-0 overflow-x-auto border-b border-tl-divider bg-tl-panel px-1">
          {model.sheets.map((s, i) => (
            <TldrawUiButton
              key={s.name}
              type="normal"
              role="tab"
              aria-selected={i === tab}
              isActive={i === tab}
              onClick={() => {
                setTab(i)
                setScrollTop(0)
              }}
            >
              <TldrawUiButtonLabel>{s.name}</TldrawUiButtonLabel>
            </TldrawUiButton>
          ))}
        </div>
      )}
      <div key={tab} className="min-h-0 flex-1 overflow-auto font-mono text-xs" onScroll={onScroll} style={{ maxHeight: 'calc(100vh - 210px)' }}>
        <div style={{ width, height: (sheet.rows.length + 1) * ROW_H, position: 'relative' }}>
          <div className="sticky top-0 z-10 flex bg-tl-panel font-semibold shadow-sm" style={{ height: ROW_H, width }}>
            <div className="w-14 shrink-0" />
            {sheet.columns.map((c, i) => (
              <div key={i} className="shrink-0 truncate border-r border-tl-divider px-2 leading-7" style={{ width: COL_W }} title={c}>
                {c}
              </div>
            ))}
          </div>
          {sheet.rows.slice(window_.start, window_.end).map((row, k) => {
            const r = window_.start + k
            return (
              <div key={r} className="absolute flex border-b border-tl-divider" style={{ top: (r + 1) * ROW_H, height: ROW_H, width }} data-row={r}>
                <div className="w-14 shrink-0 px-2 text-right leading-7 text-tl-text-3">{r + 1}</div>
                {row.map((c, i) => (
                  <div key={i} className="shrink-0 truncate border-r border-tl-divider px-2 leading-7" style={{ width: COL_W }} title={fmt(c)}>
                    {fmt(c)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      {sheet.truncated && (
        <p className="border-t border-tl-divider reif-meta px-3 py-1.5">
          Mostrando {sheet.rows.length.toLocaleString('pt-BR')} de {sheet.totalRows.toLocaleString('pt-BR')} linhas.
        </p>
      )}
    </div>
  )
}
