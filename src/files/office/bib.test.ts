import { expect, it } from 'vitest'
import { citation, formatAuthors, parseBib } from './bib'

const BIB = String.raw`
@comment{ignorar}
@article{watson1953,
  author = {James D. Watson and Francis H. C. Crick},
  title = {Molecular Structure of {Nucleic} Acids},
  journal = "Nature",
  year = 1953,
  doi = {10.1038/171737a0}
}
@book{freire, author = {Freire, Paulo}, title = {Pedagogia do Oprimido}, publisher = {Paz e Terra}, year = {1970}}
`

it('parseia entradas, chaves aninhadas, aspas e números', () => {
  const e = parseBib(BIB)
  expect(e.map((x) => x.key)).toEqual(['watson1953', 'freire'])
  expect(e[0]!.fields).toMatchObject({ title: 'Molecular Structure of Nucleic Acids', journal: 'Nature', year: '1953', doi: '10.1038/171737a0' })
})

it('formata autores e citação', () => {
  expect(formatAuthors('James D. Watson and Francis H. C. Crick')).toBe('WATSON, J. D.; CRICK, F. H. C.')
  expect(formatAuthors('Freire, Paulo')).toBe('FREIRE, P.')
  expect(citation(parseBib(BIB)[1]!)).toBe('FREIRE, P. Pedagogia do Oprimido. Paz e Terra, 1970')
})
