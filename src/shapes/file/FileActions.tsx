import { stopEventPropagation, useEditor, useValue } from 'tldraw'
import { actionsFor, fileJobs, runFileAction } from '../../files/ai'
import type { FileShape } from './types'

const LABEL = { transcript: '📝 Transcrever', summary: '✨ Resumo' } as const
const RUNNING = { transcript: 'Transcrevendo…', summary: 'Resumindo…' } as const

/** Ações de IA no cartão selecionado (somem quando não está em foco). */
export function FileActions({ shape }: { shape: FileShape }) {
  const editor = useEditor()
  const { id } = shape
  const focused = useValue('file:focused', () => {
    const ids = editor.getSelectedShapeIds()
    return ids.length === 1 && ids[0] === id
  }, [editor, id])
  const job = useValue('file:job', () => fileJobs.get()[id], [id])
  const ready = shape.props.status === 'ready' || shape.props.status === 'remote'
  if (!ready || (!focused && !job)) return null

  return (
    <>
      <div className="absolute top-2 right-2 z-10 flex gap-1.5" style={{ pointerEvents: 'all' }}>
        {job?.status === 'running' ? (
          <span className="rounded-md bg-black/75 px-2 py-1 text-xs text-white">{RUNNING[job.action]}</span>
        ) : (
          actionsFor(shape.props.kind).map((action) => (
            <button
              key={action}
              type="button"
              onPointerDown={stopEventPropagation}
              onClick={(e) => {
                e.stopPropagation()
                void runFileAction(editor, shape, action)
              }}
              className="rounded-md bg-black/75 px-2 py-1 text-xs font-medium text-white hover:bg-black"
              data-testid={`file-${action}`}
            >
              {LABEL[action]}
            </button>
          ))
        )}
      </div>
      {job?.status === 'error' && (
        <div className="absolute inset-x-2 bottom-2 z-10 rounded-md bg-red-600/90 px-2 py-1 text-xs text-white" title={job.message} data-testid="file-ai-error">
          <span className="line-clamp-2">{job.message}</span>
        </div>
      )}
    </>
  )
}
