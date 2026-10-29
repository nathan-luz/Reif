import { expect, it } from 'vitest'
import { rtfToParagraphs } from './rtf'

it('converte RTF em parágrafos (hex, unicode, grupos ignorados)', () => {
  const rtf = String.raw`{\rtf1\ansi{\fonttbl{\f0 Arial;}}{\colortbl;\red0\green0\blue0;}{\*\generator Word;}\f0 Hist\'f3ria\tab do Brasil\par Independ\u234?ncia em 1822.\line Fim \{chaves\}\par}`
  expect(rtfToParagraphs(rtf)).toEqual(['História\tdo Brasil', 'Independência em 1822.', 'Fim {chaves}'])
})
