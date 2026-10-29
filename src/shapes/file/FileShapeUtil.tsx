import { BaseBoxShapeUtil, HTMLContainer, T, type RecordProps } from 'tldraw'
import { openReader } from '../../files/reader/state'
import { FILE_KINDS, KIND_LABEL } from '../../files/kinds'
import { FileCardView } from './FileCardView'
import { FILE_SHAPE, type FileShape } from './types'

export class FileShapeUtil extends BaseBoxShapeUtil<FileShape> {
  static override type = FILE_SHAPE
  static override props: RecordProps<FileShape> = {
    w: T.number,
    h: T.number,
    kind: T.literalEnum(...FILE_KINDS),
    name: T.string,
    mime: T.string,
    size: T.number,
    fileId: T.string,
    sourceUrl: T.string,
    status: T.literalEnum('analyzing', 'ready', 'remote', 'error'),
    stats: T.string,
    excerpt: T.string,
    title: T.string,
    hasThumb: T.boolean,
    duration: T.number,
  }

  override getDefaultProps(): FileShape['props'] {
    return {
      w: 300, h: 240, kind: 'text', name: '', mime: '', size: 0, fileId: '', sourceUrl: '',
      status: 'analyzing', stats: '', excerpt: '', title: '', hasThumb: false, duration: 0,
    }
  }

  /** Contexto para o LLM (o texto completo vai como anexo na fase de IA). */
  override getText(shape: FileShape) {
    const { kind, name, title, stats, excerpt } = shape.props
    return `[${KIND_LABEL[kind]}: ${title || name} — ${stats}] ${excerpt}`.trim()
  }

  override onDoubleClick(shape: FileShape) {
    if (shape.props.kind !== 'audio') openReader(shape.id)
  }

  override component(shape: FileShape) {
    return (
      <HTMLContainer style={{ width: shape.props.w, height: shape.props.h }}>
        <FileCardView shape={shape} />
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: FileShape) {
    const path = new Path2D()
    path.roundRect(0, 0, shape.props.w, shape.props.h, 12)
    return path
  }
}
