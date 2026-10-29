import { expect, it } from 'vitest'
import { dirOf, resolvePath } from './zip'

it('resolvePath', () => {
  expect(resolvePath('ppt/slides', '../media/a.png')).toBe('ppt/media/a.png')
  expect(resolvePath('OEBPS/text', './c1.xhtml')).toBe('OEBPS/text/c1.xhtml')
  expect(resolvePath('a/b', '/root.xml')).toBe('root.xml')
  expect(resolvePath('', 'x/y.png')).toBe('x/y.png')
  expect(dirOf('a/b/c.xml')).toBe('a/b')
})
