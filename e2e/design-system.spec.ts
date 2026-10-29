import { expect, test } from '@playwright/test'
import { openCanvas, plan } from './helpers'

test('trocar design system re-estiliza o gerado, preserva o manual e mantém legível em fundo escuro', async ({ page }) => {
  await openCanvas(page)
  await page.route('**/api/transform', (r) =>
    r.fulfill({ json: plan([{ ref: 'g', kind: 'geo', text: 'Gerado', x: 600, y: 100, points: [], role: 'primary' }]) }),
  )
  await page.evaluate(() => {
    window.editor.createShape({ id: 'shape:manual' as never, type: 'geo', x: 100, y: 100, props: { w: 200, h: 100 } })
  })
  await page.mouse.click(700, 600)
  await page.keyboard.press('/')
  await page.getByLabel('Prompt para a seleção').fill('gere')
  await page.getByLabel('Prompt para a seleção').press('Enter')
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBe(2)

  await page.getByTestId('main-menu.button').click()
  await page.getByText('Design system').click()
  await page.getByText('Blueprint').click()
  await page.keyboard.press('Escape')

  const state = await page.evaluate(() => {
    const ed = window.editor
    const [manual, generated] = ['shape:manual', ed.getCurrentPageShapes().find((s) => s.id !== 'shape:manual')!.id].map(
      (id) => ed.getShape(id as never)!.props as { font: string; dash: string; color: string },
    )
    const stroke = getComputedStyle(document.querySelector('[data-shape-id="shape:manual"] path[stroke]')!).stroke
    const bg = getComputedStyle(ed.getContainer()).getPropertyValue('--tl-color-background').trim()
    return { manual, generated, stroke, bg }
  })
  expect(state.generated).toMatchObject({ font: 'mono', dash: 'solid', color: 'ds-primary' })
  expect(state.manual).toMatchObject({ font: 'draw', dash: 'draw', color: 'black' })
  expect(state.bg).toBe('#0b2a5b')
  // "preto" exibido claro sobre o fundo escuro
  expect(state.stroke).not.toBe('rgb(29, 29, 29)')
})
