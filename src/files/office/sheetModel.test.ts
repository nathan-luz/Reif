import { describe, expect, it } from 'vitest'
import { decodeText, detectDelimiter, jsonToMatrix, MAX_ROWS, previewTsv, sheetToText, toTable } from './sheetModel'

describe('toTable', () => {
  it('usa a 1ª linha como cabeçalho quando é toda texto e completa linhas curtas', () => {
    const t = toTable('A', [['nome', 'nota'], ['Ana', 9], ['Bia']])
    expect(t.columns).toEqual(['nome', 'nota'])
    expect(t.rows).toEqual([['Ana', 9], ['Bia', null]])
    expect(t.totalRows).toBe(2)
  })
  it('gera A, B, C… quando não há cabeçalho e ignora linhas vazias', () => {
    const t = toTable('A', [[1, 2], [null, ''], [3, 4]])
    expect(t.columns).toEqual(['A', 'B'])
    expect(t.rows).toHaveLength(2)
  })
  it('trunca acima do limite e informa o total', () => {
    const matrix = [['x'], ...Array.from({ length: MAX_ROWS + 5 }, (_, i) => [i])]
    const t = toTable('A', matrix)
    expect(t.rows).toHaveLength(MAX_ROWS)
    expect(t.totalRows).toBe(MAX_ROWS + 5)
    expect(t.truncated).toBe(true)
  })
})

describe('jsonToMatrix', () => {
  it('array de objetos → união das chaves', () => {
    expect(jsonToMatrix([{ a: 1 }, { b: { c: 2 } }])).toEqual([['a', 'b'], [1, null], [null, '{"c":2}']])
  })
  it('objeto → chave/valor', () => {
    expect(jsonToMatrix({ x: 1 })).toEqual([['chave', 'valor'], ['x', 1]])
  })
})

it('prévia e texto para a IA', () => {
  const t = toTable('Notas', [['aluno', 'obs'], ['Ana', 'disse "oi", saiu']])
  expect(previewTsv(t)).toBe('aluno\tobs\nAna\tdisse "oi", saiu')
  expect(sheetToText({ type: 'sheet', sheets: [t] }, 10_000)).toContain('Ana,"disse ""oi"", saiu"')
})

describe('CSV do mundo real', () => {
  it('decodifica UTF-8 e cai para Windows-1252 (Excel BR)', () => {
    expect(decodeText(new TextEncoder().encode('vírgula'))).toBe('vírgula')
    expect(decodeText(new Uint8Array([0x76, 0xed, 0x72, 0x67]))).toBe('virg'.replace('i', 'í'))
  })
  it('detecta o separador ignorando o conteúdo entre aspas', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',')
    expect(detectDelimiter('nome;nota;obs\n"a,b";1;2')).toBe(';')
    expect(detectDelimiter('"x,y,z";a;b')).toBe(';')
    expect(detectDelimiter('a\tb')).toBe('\t')
    expect(detectDelimiter('sozinho')).toBe(',')
  })
})
