import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

const HERO = readFileSync(new URL('./assets/hero.jpg', import.meta.url)).toString('base64')
const T = (ref: string, text: string, role: string, extra = {}) => ({ ref, kind: 'text', text, x: 0, y: 0, points: [], role, ...extra })
const F = (ref: string, text: string) => ({ ref, kind: 'frame', text, x: 0, y: 0, points: [], role: 'container' })

test.use({ storageState: { cookies: [], origins: [{ origin: 'http://localhost:5199', localStorage: [{ name: 'reif:design-system', value: 'handwritten' }] }] } })

test('folha de estudo: seções agrupadas, doodles, fonte manuscrita e ilustração gerada sem fundo', async ({ page }) => {
  const { errors } = await openCanvas(page)
  const plan = {
    design: '', summary: 'ok', delete: [], update: [], connect: [], layout: { type: 'sheet', root: 'hero' },
    create: [
      T('t', 'Sistema Digestório', 'title'),
      { ref: 'hero', kind: 'image', text: 'sistema digestório', generate: 'human digestive system', x: 0, y: 0, points: [], role: 'accent' },
      F('s1', '1. Introdução'), T('a', '• Quebra o alimento em nutrientes', 'body', { frame: 's1' }),
      { ref: 'd', kind: 'doodle', icon: 'apple', text: '', x: 0, y: 0, points: [], frame: 's1' },
      F('s2', '2. Funções'), T('b', '• Absorve água e minerais', 'body', { frame: 's2' }),
    ],
  }
  let generated: { prompt: string; designSystem: string } | null = null
  await page.route('**/api/transform', (r) => r.fulfill({ json: { plan, warnings: [] } }))
  await page.route('**/api/images/generate', (r) => {
    generated = r.request().postDataJSON()
    return r.fulfill({ json: { image: `data:image/jpeg;base64,${HERO}`, removeBackground: 'light' } })
  })
  await page.mouse.click(700, 400)
  await page.keyboard.press('/')
  await page.getByLabel('Prompt para a seleção').fill('folha de estudo do sistema digestório')
  await page.keyboard.press('Enter')

  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().some((s) => s.type === 'image'))).toBe(true)
  expect(generated).toEqual({ prompt: 'human digestive system', designSystem: 'handwritten' })
  const info = await page.evaluate(async () => {
    const ed = window.editor
    const shapes = ed.getCurrentPageShapes()
    const image = shapes.find((s) => s.type === 'image')!
    const asset = ed.getAsset((image as import('tldraw').TLImageShape).props.assetId!)!
    const src = await ed.resolveAssetUrl(asset.id, { shouldResolveToOriginal: true })
    const img = new Image()
    img.src = src!
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    return {
      slots: shapes.filter((s) => s.type === 'image-slot').length,
      groups: shapes.filter((s) => s.type === 'group' && s.parentId === ed.getCurrentPageId()).length,
      draws: shapes.filter((s) => s.type === 'draw').length,
      fonts: [...new Set(shapes.flatMap((s) => ('font' in s.props ? [(s.props as { font: string }).font] : [])))].sort(),
      cornerAlpha: ctx.getImageData(2, 2, 1, 1).data[3],
      centerAlpha: ctx.getImageData(img.naturalWidth / 2 - 200, img.naturalHeight / 2, 1, 1).data[3],
      paper: document.querySelector('.tl-background')?.getAttribute('data-paper'),
    }
  })
  expect(info.slots).toBe(0) // slot substituído pela imagem
  expect(info.groups).toBe(2) // uma por seção
  expect(info.draws).toBeGreaterThan(1) // doodle em traços à mão
  expect(info.fonts).toEqual(['hand', 'script'])
  expect(info.cornerAlpha).toBe(0) // fundo removido
  expect(info.centerAlpha).toBe(255)
  expect(info.paper).toBe('dots')
  await expectNoErrors(errors)
})
