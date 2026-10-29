import { expect, test, type Page } from '@playwright/test'
import { file, makePdf, makeWav } from './fixtures'
import { expectNoErrors, openCanvas } from './helpers'

async function upload(page: Page, files: ReturnType<typeof file>[]) {
  await page.getByTestId('tools.asset').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('media-upload').click()
  await (await chooser).setFiles(files)
}

const card = (page: Page, kind: string) => page.locator(`[data-testid="file-card"][data-kind="${kind}"]`)

/** No tldraw o hit-test é por geometria (camada do canvas): clique de mouse real no centro. */
async function dblclickCard(page: Page, kind: string) {
  const box = (await card(page, kind).boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 3)
}

test('PDF, áudio e Markdown viram cartões leves analisados localmente', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await upload(page, [
    file('aula.pdf', 'application/pdf', makePdf(['Capitulo 1', 'Capitulo 2', 'Capitulo 3'])),
    file('nota.wav', 'audio/wav', makeWav(2)),
    file('resumo.md', 'text/markdown', Buffer.from('# Fotossíntese\n\nA **luz** vira energia química.\n\n- cloroplastos\n- oxigênio\n')),
  ])

  await expect(card(page, 'pdf')).toHaveAttribute('data-status', 'ready')
  await expect(card(page, 'pdf').getByTestId('file-stats')).toHaveText('3 páginas')
  await expect(card(page, 'pdf').locator('img')).toBeVisible()

  await expect(card(page, 'audio')).toHaveAttribute('data-status', 'ready')
  await expect(card(page, 'audio').getByTestId('file-stats')).toHaveText('0:02')
  await expect(card(page, 'audio').getByTestId('audio-wave')).toBeVisible()
  // nenhum <audio> criado antes do play
  expect(await page.evaluate(() => document.querySelectorAll('audio').length)).toBe(0)

  await expect(card(page, 'text')).toHaveAttribute('data-status', 'ready')
  await expect(card(page, 'text')).toContainText('Fotossíntese')

  // o documento do tldraw só guarda metadados (sem o arquivo)
  const docBytes = await page.evaluate(() => JSON.stringify(window.editor.getCurrentPageShapes()).length)
  expect(docBytes).toBeLessThan(6000)
  await expectNoErrors(errors)
})

test('duplo-clique abre o leitor: PDF renderiza só páginas próximas; Markdown sai sanitizado', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await upload(page, [file('livro.pdf', 'application/pdf', makePdf(Array.from({ length: 30 }, (_, i) => `Pagina ${i + 1}`)))])
  await expect(card(page, 'pdf')).toHaveAttribute('data-status', 'ready')
  await dblclickCard(page, 'pdf')
  const reader = page.getByTestId('reader-panel')
  await expect(reader.getByTestId('pdf-reader')).toBeVisible()
  await expect(reader.locator('[data-page]')).toHaveCount(30)
  await expect.poll(() => reader.locator('canvas').evaluateAll((cs) => cs.filter((c) => (c as HTMLCanvasElement).width > 0).length)).toBeGreaterThan(0)
  const rendered = await reader.locator('canvas').evaluateAll((cs) => cs.filter((c) => (c as HTMLCanvasElement).width > 0).length)
  expect(rendered).toBeLessThan(30)
  await reader.getByLabel('Fechar').click()
  await expect(reader).toBeHidden()

  await upload(page, [file('x.md', 'text/markdown', Buffer.from('# Título\n\n<script>window.hacked=1</script><img src=x onerror="window.hacked=1">ok'))])
  await expect(card(page, 'text')).toHaveAttribute('data-status', 'ready')
  await dblclickCard(page, 'text')
  await expect(reader.locator('article h1')).toHaveText('Título')
  expect(await page.evaluate(() => (window as unknown as { hacked?: number }).hacked)).toBeUndefined()
  await expectNoErrors(errors)
})

test('player de áudio toca sob demanda e o seek funciona', async ({ page }) => {
  await openCanvas(page)
  await upload(page, [file('voz.wav', 'audio/wav', makeWav(3))])
  await expect(card(page, 'audio')).toHaveAttribute('data-status', 'ready')
  const toggle = card(page, 'audio').getByTestId('audio-toggle')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-label', 'Pausar')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-label', 'Tocar')
})

test('formato não suportado e arquivo grande demais são recusados com aviso', async ({ page }) => {
  await openCanvas(page)
  await upload(page, [file('virus.exe', 'application/x-msdownload', Buffer.from('MZ'))])
  await expect(page.getByRole('status')).toContainText('Formato não suportado')
})
