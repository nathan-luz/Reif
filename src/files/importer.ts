import { createShapeId, type Editor, type TLShapeId, type VecLike } from 'tldraw'
import { notify } from '../canvas/notify/notify'
import { FILE_SHAPE, type FileShape, type FileShapeProps } from '../shapes/file/types'
import { loadAnalyzer } from './analyzers'
import type { Analysis } from './analyzers/types'
import { derivedKey, downloadViaProxy, getFileBlob } from './blob'
import { CARD_SIZE, detectKind, formatBytes, KIND_LABEL, MAX_SIZE, WEB_COPY_LIMIT, type FileKind } from './kinds'
import { checkStorage, newFileId, putBlob, putDerived } from './store'
import { occupiedRects } from '../canvas/mutations/apply'
import { groupOffset } from '../canvas/mutations/placement'

const GAP = 24

function fileNameFromUrl(url: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? '')
    return last || 'arquivo'
  } catch {
    return 'arquivo'
  }
}

function createCard(editor: Editor, at: VecLike, props: Partial<FileShapeProps> & { kind: FileKind }): TLShapeId {
  const id = createShapeId()
  const size = CARD_SIZE[props.kind]
  editor.createShape<FileShape>({
    id,
    type: FILE_SHAPE,
    x: at.x,
    y: at.y,
    parentId: editor.getCurrentPageId(),
    props: { ...size, ...props },
  })
  return id
}

/** Persiste derivados e atualiza o cartão sem criar entrada de undo. */
async function applyAnalysis(editor: Editor, id: TLShapeId, key: string, a: Analysis) {
  await Promise.all([
    a.thumb && putDerived(key, 'thumb', a.thumb),
    a.peaks && putDerived(key, 'peaks', a.peaks),
    a.text && putDerived(key, 'text', a.text),
    a.model !== undefined && putDerived(key, 'model', a.model),
  ])
  if (!editor.getShape(id)) return
  editor.run(
    () =>
      editor.updateShape<FileShape>({
        id,
        type: FILE_SHAPE,
        props: {
          status: 'ready',
          stats: a.stats,
          excerpt: a.excerpt,
          title: a.title ?? '',
          hasThumb: Boolean(a.thumb),
          duration: a.duration ?? 0,
        },
      }),
    { history: 'ignore' },
  )
}

async function analyze(editor: Editor, id: TLShapeId, blob: Blob) {
  const shape = editor.getShape<FileShape>(id)
  if (!shape) return
  try {
    const ctx = shape.props.sourceUrl ? { sourceUrl: shape.props.sourceUrl } : {}
    const analysis = await (await loadAnalyzer(shape.props.kind))(blob, shape.props.name, ctx)
    await applyAnalysis(editor, id, derivedKey(shape), analysis)
  } catch (err) {
    console.error(err)
    editor.run(
      () =>
        editor.updateShape<FileShape>({
          id,
          type: FILE_SHAPE,
          props: { status: 'error', stats: 'Não foi possível ler o arquivo' },
        }),
      { history: 'ignore' },
    )
  }
}

async function warnIfStorageLow() {
  const s = await checkStorage().catch(() => null)
  if (s && s.quota && s.usage / s.quota > 0.8) {
    notify(`Armazenamento local em ${Math.round((s.usage / s.quota) * 100)}%: considere remover arquivos grandes.`, 'warning')
  }
}

/** Valida tipo/tamanho; devolve o tipo ou avisa o usuário. */
function accept(name: string, mime: string, size: number): FileKind | null {
  const kind = detectKind(name, mime)
  if (!kind) {
    notify(`Formato não suportado: ${name}`, 'error')
    return null
  }
  if (size > MAX_SIZE[kind]) {
    notify(`${name} tem ${formatBytes(size)}; o limite para ${KIND_LABEL[kind]} é ${formatBytes(MAX_SIZE[kind])}.`, 'error')
    return null
  }
  return kind
}

/** Importa arquivos locais (upload, arrastar, colar, gravação) lado a lado a partir de `point`. */
export async function importFiles(editor: Editor, files: File[], point?: VecLike, sourceUrl = ''): Promise<TLShapeId[]> {
  const origin = point ?? editor.getViewportPageBounds().center
  const accepted = files.flatMap((file) => {
    const kind = accept(file.name, file.type, file.size)
    return kind ? [{ file, kind }] : []
  })
  // Linha centralizada no ponto; o bloco desvia do que já existe (nada nasce empilhado).
  const totalW = accepted.reduce((w, a) => w + CARD_SIZE[a.kind].w, 0) + GAP * Math.max(0, accepted.length - 1)
  let x = origin.x - totalW / 2
  const slots = accepted.map((a) => {
    const size = CARD_SIZE[a.kind]
    const rect = { x, y: origin.y - size.h / 2, ...size }
    x += size.w + GAP
    return rect
  })
  const dx = groupOffset(slots, occupiedRects(editor))
  const ids: TLShapeId[] = []
  editor.markHistoryStoppingPoint('reif:import-files')
  const jobs: Promise<void>[] = []
  for (const [i, { file, kind }] of accepted.entries()) {
    const fileId = newFileId()
    const slot = slots[i]!
    const id = createCard(editor, { x: slot.x + dx, y: slot.y }, {
      kind, name: file.name, mime: file.type, size: file.size, fileId, sourceUrl, status: 'analyzing', stats: 'Analisando…',
    })
    ids.push(id)
    jobs.push(putBlob(fileId, file).then(() => analyze(editor, id, file)))
  }
  if (ids.length) {
    editor.select(...ids)
    // Importou vários e algum ficou fora da tela: enquadra todos (sem mudar o zoom à toa).
    const bounds = editor.getSelectionPageBounds()
    if (bounds && !editor.getViewportPageBounds().contains(bounds)) {
      editor.zoomToSelection({ animation: { duration: 220 } })
    }
  }
  await Promise.all(jobs)
  if (ids.length) void warnIfStorageLow()
  return ids
}

interface HeadInfo {
  name: string
  size: number
  type: string
}

async function head(url: string): Promise<HeadInfo> {
  const res = await fetch(`/api/files/head?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`Não foi possível acessar o link (HTTP ${res.status})`)
  return (await res.json()) as HeadInfo
}

/** Arquivo da web: até 20 MB vira cópia local; acima, cartão só-link (baixa ao abrir). */
export async function importFromUrl(editor: Editor, url: string, point?: VecLike): Promise<TLShapeId | null> {
  try {
    const info = await head(url)
    let name = info.name || fileNameFromUrl(url)
    // páginas web: nome estável com .html (o título real vem do Readability)
    if (/^text\/html|xhtml/.test(info.type) && !/\.html?$/i.test(name)) name = `${new URL(url).hostname}.html`
    const kind = accept(name, info.type, info.size)
    if (!kind) return null
    if (!info.size || info.size <= WEB_COPY_LIMIT) {
      const blob = await downloadViaProxy(url)
      const [id] = await importFiles(editor, [new File([blob], name, { type: blob.type || info.type })], point, url)
      return id ?? null
    }
    const at = point ?? editor.getViewportPageBounds().center
    const size = CARD_SIZE[kind]
    const slot = { x: at.x - size.w / 2, y: at.y - size.h / 2, ...size }
    const dx = groupOffset([slot], occupiedRects(editor))
    editor.markHistoryStoppingPoint('reif:import-link')
    const id = createCard(editor, { x: slot.x + dx, y: slot.y }, {
      kind, name, mime: info.type, size: info.size, fileId: '', sourceUrl: url, status: 'remote',
      stats: `Link · ${formatBytes(info.size)}`,
    })
    editor.select(id)
    notify(`${name} tem ${formatBytes(info.size)}: guardei só o link. Ele é baixado quando você abrir.`, 'info')
    return id
  } catch (err) {
    notify(err instanceof Error ? err.message : String(err), 'error')
    return null
  }
}

/** Cartão só-link: baixa e analisa (derivados ficam em cache; o original não é salvo). */
export async function hydrateRemote(editor: Editor, shape: FileShape): Promise<Blob> {
  const blob = await getFileBlob(shape)
  if (shape.props.status === 'remote') {
    const analysis = await (await loadAnalyzer(shape.props.kind))(blob, shape.props.name, { sourceUrl: shape.props.sourceUrl })
    await applyAnalysis(editor, shape.id, derivedKey(shape), analysis)
    editor.run(
      () => editor.updateShape<FileShape>({ id: shape.id, type: FILE_SHAPE, props: { status: 'remote', stats: `${analysis.stats} · link` } }),
      { history: 'ignore' },
    )
  }
  return blob
}
