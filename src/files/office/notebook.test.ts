import { expect, it } from 'vitest'
import { parseNotebook } from './notebook'

it('lê células, saídas de texto/erro/imagem e a linguagem', () => {
  const nb = parseNotebook({
    metadata: { language_info: { name: 'python' } },
    cells: [
      { cell_type: 'markdown', source: ['# Título\n', 'texto'] },
      {
        cell_type: 'code',
        source: 'print(1)',
        outputs: [
          { output_type: 'stream', text: ['1\n'] },
          { output_type: 'display_data', data: { 'image/png': 'iVBOR\nw0K' } },
          { output_type: 'error', ename: 'ValueError', evalue: 'x' },
        ],
      },
      { cell_type: 'raw', source: 'ignorar' },
    ],
  })
  expect(nb.language).toBe('python')
  expect(nb.cells).toHaveLength(2)
  expect(nb.cells[0]!.source).toBe('# Título\ntexto')
  expect(nb.cells[1]!.outputs).toEqual([
    { kind: 'text', data: '1\n' },
    { kind: 'image', data: 'data:image/png;base64,iVBORw0K' },
    { kind: 'text', data: 'ValueError: x' },
  ])
})
