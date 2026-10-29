import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

test('barra de prompt aparece centralizada logo acima do bounding box da seleção', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await page.evaluate(() => {
    const ed = window.editor
    ed.createShapes([
      { id: 'shape:n1' as never, type: 'note', x: 300, y: 300 },
      { id: 'shape:n2' as never, type: 'note', x: 560, y: 340 },
    ])
    ed.select('shape:n1' as never, 'shape:n2' as never)
  })
  const bar = page.getByTestId('ai-prompt-bar')
  await expect(bar).toBeVisible()

  const sel = await page.evaluate(() => {
    const ed = window.editor
    const b = ed.getSelectionPageBounds()!
    const tl = ed.pageToViewport({ x: b.minX, y: b.minY })
    const br = ed.pageToViewport({ x: b.maxX, y: b.maxY })
    const vp = ed.getViewportScreenBounds()
    return { top: tl.y + vp.y, midX: (tl.x + br.x) / 2 + vp.x }
  })
  const box = (await bar.boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - sel.midX)).toBeLessThan(2)
  expect(sel.top - (box.y + box.height)).toBeCloseTo(12, 0)

  // acompanha a câmera
  await page.evaluate(() => {
    window.editor.setCamera({ x: -150, y: 80, z: 1 })
  })
  const moved = (await bar.boundingBox())!
  expect(moved.x).not.toBeCloseTo(box.x, 0)

  await expectNoErrors(errors)
})

test('digitar na barra não aciona atalhos do canvas', async ({ page }) => {
  await openCanvas(page)
  await page.evaluate(() => {
    window.editor.createShape({ id: 'shape:n1' as never, type: 'note', x: 300, y: 300 })
    window.editor.select('shape:n1' as never)
  })
  await page.getByLabel('Prompt para a seleção').fill('desenhe e delete')
  await page.getByLabel('Prompt para a seleção').press('Delete')
  expect(await page.evaluate(() => window.editor.getCurrentToolId())).toBe('select')
  expect(await page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBe(1)
})

test('a barra some durante o arraste', async ({ page }) => {
  await openCanvas(page)
  await page.evaluate(() => {
    window.editor.createShape({ id: 'shape:n1' as never, type: 'note', x: 400, y: 400 })
    window.editor.select('shape:n1' as never)
  })
  const bar = page.getByTestId('ai-prompt-bar')
  await expect(bar).toBeVisible()
  const center = await page.evaluate(() => {
    const ed = window.editor
    const b = ed.getShapePageBounds('shape:n1' as never)!
    return ed.pageToScreen(b.center)
  })
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + 80, center.y + 40, { steps: 5 })
  await expect(bar).toBeHidden()
  await page.mouse.up()
  await expect(bar).toBeVisible()
})
