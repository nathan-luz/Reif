import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas, plan, shapeTypes } from './helpers'

test('"/" abre a barra sem seleção; o plano do LLM vira shapes e um Ctrl+Z desfaz tudo', async ({ page }) => {
  const { errors } = await openCanvas(page)
  let request: { subgraph: { mode: string }; designSystem: string } | null = null
  await page.route('**/api/transform', async (route) => {
    request = route.request().postDataJSON()
    await route.fulfill({
      json: plan(
        [
          { ref: 'f', kind: 'frame', text: 'Ciclo', x: 0, y: 0, w: 700, h: 400, points: [] },
          { ref: 'a', kind: 'geo', geo: 'cloud', text: 'Nuvem', x: 40, y: 60, points: [], role: 'primary', frame: 'f' },
          { ref: 'b', kind: 'geo', geo: 'ellipse', text: 'Mar', x: 400, y: 220, points: [], role: 'secondary', frame: 'f' },
          { ref: 'l', kind: 'line', text: '', x: 0, y: 450, points: [{ x: 0, y: 450 }, { x: 300, y: 450 }, { x: 600, y: 480 }], curved: true },
          { ref: 'd', kind: 'draw', text: '', x: 0, y: 520, points: [{ x: 0, y: 520 }, { x: 40, y: 560 }, { x: 80, y: 520 }, { x: 0, y: 520 }], role: 'accent' },
        ],
        { connect: [{ from: 'a', to: 'b', label: 'chuva' }] },
      ),
    })
  })

  await page.mouse.click(700, 500)
  await page.keyboard.press('/')
  const input = page.getByLabel('Prompt para a seleção')
  await expect(input).toBeFocused()
  await input.fill('desenhe o ciclo da água')
  await input.press('Enter')

  await expect.poll(() => shapeTypes(page)).toEqual(['arrow', 'draw', 'frame', 'geo', 'geo', 'line'])
  expect(request!.subgraph.mode).toBe('viewport')
  expect(request!.designSystem).toBe('classic')

  const line = await page.evaluate(() => {
    const l = window.editor.getCurrentPageShapes().find((s) => s.type === 'line')!
    return Object.values((l.props as { points: Record<string, { x: number }> }).points).map((p) => p.x)
  })
  expect(line).toEqual([0, 300, 600])

  // atalho real de desfazer (foco no canvas)
  await page.keyboard.press('Escape')
  await page.locator('.tl-canvas').focus()
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => shapeTypes(page)).toEqual([])
  await expectNoErrors(errors)
})

test('erro do servidor aparece na barra', async ({ page }) => {
  await openCanvas(page)
  await page.route('**/api/transform', (r) => r.fulfill({ status: 502, json: { error: 'gemini 503: sobrecarga' } }))
  await page.evaluate(() => {
    window.editor.createShape({ id: 'shape:n1' as never, type: 'note', x: 300, y: 300 })
    window.editor.select('shape:n1' as never)
  })
  await page.getByLabel('Prompt para a seleção').fill('resuma')
  await page.getByLabel('Prompt para a seleção').press('Enter')
  await expect(page.getByText('gemini 503: sobrecarga')).toBeVisible()
})
