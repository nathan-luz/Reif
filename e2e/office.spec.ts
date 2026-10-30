import { expect, test, type Page } from '@playwright/test'
import { file, makeDocx, makeEpub, makeOdp, makeOdt, makePptx, makeRtf } from './fixtures'
import { expectNoErrors, openCanvas } from './helpers'

async function upload(page: Page, files: ReturnType<typeof file>[]) {
  await page.getByTestId('tools.asset').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('media-upload').click()
  await (await chooser).setFiles(files)
}

const cardByName = (page: Page, name: string) => page.locator('[data-testid="file-card"]', { hasText: name })

async function open(page: Page, name: string) {
  const box = (await cardByName(page, name).boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 3)
  return page.getByTestId('reader-panel')
}

test('DOCX, ODT, RTF, EPUB, PPTX e ODP: cartões e leitores', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await upload(page, [
    file('relatorio.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', await makeDocx()),
    file('resumo.odt', 'application/vnd.oasis.opendocument.text', await makeOdt()),
    file('historia.rtf', 'application/rtf', makeRtf()),
    file('livro.epub', 'application/epub+zip', await makeEpub()),
    file('aula.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', await makePptx()),
    file('genetica.odp', 'application/vnd.oasis.opendocument.presentation', await makeOdp()),
  ])
  await expect.poll(() => page.locator('[data-testid="file-card"][data-status="ready"]').count(), { timeout: 20_000 }).toBe(6)

  await expect(cardByName(page, 'Relatório de Biologia')).toContainText('célula é a unidade')
  await expect(cardByName(page, 'Resumo ODT')).toContainText('Mitocôndria produz ATP')
  await expect(cardByName(page, 'historia.rtf')).toContainText('História do Brasil Independência em 1822')
  await expect(cardByName(page, 'Dom Casmurro').getByTestId('file-stats')).toHaveText('2 capítulos · Machado de Assis')
  await expect(cardByName(page, 'Dom Casmurro').locator('img')).toBeVisible()
  await expect(cardByName(page, 'Revolução Industrial').getByTestId('file-stats')).toHaveText('2 slides')
  await expect(cardByName(page, 'Revolução Industrial').locator('img')).toBeVisible()
  await expect(cardByName(page, 'Genética').getByTestId('file-stats')).toHaveText('1 slide')

  let reader = await open(page, 'Relatório de Biologia')
  await expect(reader.getByTestId('doc-reader').locator('h1')).toHaveText('Relatório de Biologia')
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'Dom Casmurro')
  await expect(reader.getByTestId('doc-reader').locator('article h1')).toHaveText('Do título')
  await expect(reader.locator('article img')).toHaveAttribute('src', /^data:image\/png/)
  await reader.getByRole('button', { name: 'Próximo capítulo' }).click()
  await expect(reader.locator('article h1')).toHaveText('Do livro')
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'Revolução Industrial')
  const slides = reader.getByTestId('slides-reader')
  await expect(slides.locator('[data-slide]')).toHaveCount(2)
  await expect(slides.locator('[data-slide="1"]')).toContainText('Máquina a vapor')
  await expect(slides.locator('[data-slide="1"] img')).toHaveCount(1)
  await expect(slides.locator('[data-slide="1"] details')).toContainText('Citar a Inglaterra')
  await expectNoErrors(errors)
})
