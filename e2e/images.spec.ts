import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

// PNG 1x1 transparente
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test('ferramenta Inserir: "Buscar imagem na web" → resultados progressivos → imagem inserida com crédito', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await page.route('**/api/images/search**', (route) => {
    const source = new URL(route.request().url()).searchParams.get('source')
    if (source === 'wikimedia') {
      return route.fulfill({
        json: {
          results: [{ id: 'wikimedia:1', source: 'wikimedia', thumb: '/api/images/proxy?url=x', url: 'https://upload.wikimedia.org/cat.png', width: 400, height: 300, title: 'Gatinho', author: 'Fulano', pageUrl: 'https://commons/cat', license: 'CC BY 4.0', hotlink: false }],
          sources: [{ source, status: 'ok', count: 1 }],
        },
      })
    }
    const status = source === 'pexels' ? 'unconfigured' : 'empty'
    return route.fulfill({ json: { results: [], sources: [{ source, status, count: 0 }] } })
  })
  await page.route('**/api/images/proxy**', (r) => r.fulfill({ body: PNG, contentType: 'image/png' }))

  await page.getByTestId('tools.asset').click()
  await page.getByTestId('media-search-web').click()
  const picker = page.getByTestId('image-picker')
  await expect(picker).toBeVisible()
  await picker.getByLabel('Buscar imagens').fill('gatinho tomando leite')
  await picker.getByRole('button', { name: 'Buscar' }).click()
  await expect(picker.getByText('Wikimedia · 1')).toBeVisible()
  await expect(picker.getByText('Pexels · sem chave')).toBeVisible()

  await picker.getByTitle('Gatinho').click()
  await expect(picker).toBeHidden()
  const image = await page.evaluate(() => {
    const s = window.editor.getCurrentPageShapes().find((x) => x.type === 'image')
    return s ? { meta: s.meta, w: (s.props as { w: number }).w } : null
  })
  expect(image?.meta).toMatchObject({ reif: { source: 'wikimedia', author: 'Fulano', license: 'CC BY 4.0' } })
  expect(image?.w).toBe(400)
  await expectNoErrors(errors)
})

test('"Enviar arquivo" mantém o seletor de arquivos nativo', async ({ page }) => {
  await openCanvas(page)
  await page.getByTestId('tools.asset').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('media-upload').click()
  await chooser
})

test('popover Inserir e popover de shapes nunca ficam abertos juntos', async ({ page }) => {
  await openCanvas(page)
  const insert = page.getByTestId('insert-popover')
  await page.getByTestId('tools.asset').click()
  await expect(insert).toBeVisible()
  await page.getByTestId('tools.more-button').click()
  await expect(insert).toHaveCount(0)
  await page.getByTestId('tools.asset').click()
  await expect(insert).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.editor.menus.getOpenMenus().length)).toBe(0)
})
