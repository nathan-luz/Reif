import { expect, test, type Page } from '@playwright/test'
import { file, makeCsv, makeXlsx } from './fixtures'
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

test('CSV grande, XLSX com abas, TSV e JSON: prévia no cartão e grade virtualizada', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await upload(page, [
    file('turma.csv', 'text/csv', makeCsv(20_000)),
    file('notas.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', await makeXlsx()),
    file('dados.tsv', 'text/tab-separated-values', Buffer.from('a\tb\n1\t2\n')),
    file('excel-br.csv', 'text/csv', Buffer.from('Aluno;Média;Situação\nJoão;8,5;Aprovação\n', 'latin1')),
    file('api.json', 'application/json', Buffer.from(JSON.stringify([{ id: 1, tag: 'x' }, { id: 2, extra: true }]))),
  ])
  await expect.poll(() => page.locator('[data-testid="file-card"][data-status="ready"]').count(), { timeout: 20_000 }).toBe(5)

  await expect(cardByName(page, 'turma.csv').getByTestId('file-stats')).toHaveText('20.000 linhas × 3 colunas')
  await expect(cardByName(page, 'turma.csv').locator('tr').first()).toContainText('comentario')
  await expect(cardByName(page, 'notas.xlsx').getByTestId('file-stats')).toHaveText('2 abas · 3 linhas')
  await expect(cardByName(page, 'dados.tsv').getByTestId('file-stats')).toHaveText('1 linha × 2 colunas')
  await expect(cardByName(page, 'excel-br.csv').locator('tr').nth(1)).toContainText('João')
  await expect(cardByName(page, 'excel-br.csv').getByTestId('file-stats')).toHaveText('1 linha × 3 colunas')
  await expect(cardByName(page, 'api.json').locator('tr').first()).toContainText('extra')

  let reader = await open(page, 'turma.csv')
  const grid = reader.getByTestId('sheet-reader')
  await expect(grid.locator('[data-row="0"]')).toContainText('texto, com vírgula 1')
  expect(await grid.locator('[data-row]').count()).toBeLessThan(120)
  await grid.locator('.overflow-auto').evaluate((el) => (el.scrollTop = 28 * 15_000))
  await expect(grid.locator('[data-row="15000"]')).toContainText('Aluno 15001')
  expect(await grid.locator('[data-row]').count()).toBeLessThan(120)
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'notas.xlsx')
  await reader.getByRole('button', { name: 'Frequência' }).click()
  await expect(reader.locator('[data-row="0"]')).toContainText('sim')
  await expectNoErrors(errors)
})
