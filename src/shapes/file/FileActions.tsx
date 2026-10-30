import { useEditor, useValue } from 'tldraw'
import { ShapeError, ShapeToolbar } from '../shared/ShapeToolbar'
import { actionsFor, fileJobs, runFileAction } from '../../files/ai'
import type { FileShape } from './types'

const ACTION = {
  transcript: { icon: 'reif-transcript', label: 'Transcrever' },
  summary: { icon: 'reif-sparkle', label: 'Resumo' },
} as const
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
      {(focused || job?.status === 'running') && (
        <ShapeToolbar
          running={job?.status === 'running' ? RUNNING[job.action] : undefined}
          actions={actionsFor(shape.props.kind).map((action) => ({
            id: action,
            ...ACTION[action],
            testId: `file-${action}`,
            onRun: () => void runFileAction(editor, shape, action),
          }))}
        />
      )}
      {job?.status === 'error' && <ShapeError message={job.message} testId="file-ai-error" />}
    </>
  )
}
