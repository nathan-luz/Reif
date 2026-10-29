import type { Editor } from 'tldraw'

const ACCEPT = [
  'image/*', 'audio/*', 'video/*',
  '.pdf', '.docx', '.odt', '.rtf', '.epub', '.pptx', '.odp',
  '.csv', '.tsv', '.xlsx', '.xls', '.ods', '.json',
  '.txt', '.md', '.markdown', '.html', '.htm', '.ipynb', '.bib', '.tex',
  '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.c', '.h', '.cpp', '.cs', '.go', '.rs', '.rb', '.php', '.sql', '.r',
  '.kt', '.swift', '.sh', '.yaml', '.yml', '.xml', '.css', '.toml', '.m',
].join(',')

/** Seletor de arquivos do sistema; o roteamento (imagem → tldraw, resto → cartões) fica no handler de 'files'. */
export function pickFiles(editor: Editor) {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = ACCEPT
  input.onchange = () => {
    const files = [...(input.files ?? [])]
    if (files.length) void editor.putExternalContent({ type: 'files', files, point: editor.getViewportPageBounds().center })
  }
  input.click()
}
