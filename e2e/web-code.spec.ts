import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { file, makePdf } from './fixtures'
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

const NOTEBOOK = JSON.stringify({
  metadata: { language_info: { name: 'python' } },
  cells: [
    { cell_type: 'markdown', source: '# Regressão Linear\nAjuste simples.' },
    { cell_type: 'code', source: 'import numpy as np\nprint(np.pi)', outputs: [{ output_type: 'stream', text: '3.14159\n' }] },
  ],
})

const BIB = '@article{watson1953, author = {James D. Watson and Francis Crick}, title = {Molecular Structure of Nucleic Acids}, journal = {Nature}, year = 1953, doi = {10.1038/171737a0}}'

test('notebook, código, referências, HTML e vídeo local', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await upload(page, [
    file('analise.ipynb', 'application/x-ipynb+json', Buffer.from(NOTEBOOK)),
    file('fib.py', 'text/x-python', Buffer.from('def fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n')),
    file('refs.bib', 'application/x-bibtex', Buffer.from(BIB)),
    file('pagina.html', 'text/html', Buffer.from('<html><head><title>Fotossíntese</title></head><body><article><h2>Introdução</h2><p>' + 'A luz é convertida em energia química pelas plantas. '.repeat(20) + '</p><script>window.hacked=1</script></article></body></html>')),
    file('clip.webm', 'video/webm', readFileSync('e2e/assets/clip.webm')),
  ])
  await expect.poll(() => page.locator('[data-testid="file-card"][data-status="ready"]').count(), { timeout: 20_000 }).toBe(5)

  await expect(cardByName(page, 'Regressão Linear').getByTestId('file-stats')).toHaveText('2 células · 1 de código')
  await expect(cardByName(page, 'fib.py').getByTestId('file-stats')).toHaveText('Python · 3 linhas')
  await expect(cardByName(page, 'fib.py')).toContainText('def fib(n):')
  await expect(cardByName(page, 'refs.bib')).toContainText('WATSON, J. D.; CRICK, F. Molecular Structure of Nucleic Acids. Nature, 1953')
  await expect(cardByName(page, 'clip.webm').getByTestId('file-stats')).toHaveText('0:02')
  await expect(cardByName(page, 'clip.webm').locator('img')).toBeVisible()
  // vídeo: nenhum <video> no canvas
  expect(await page.locator('video').count()).toBe(0)

  let reader = await open(page, 'fib.py')
  await expect(reader.locator('.hljs-keyword').first()).toHaveText('def')
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'Regressão Linear')
  await expect(reader.getByTestId('notebook-reader').locator('h1')).toHaveText('Regressão Linear')
  await expect(reader.getByTestId('notebook-reader')).toContainText('3.14159')
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'refs.bib')
  await expect(reader.getByRole('link', { name: 'DOI' })).toHaveAttribute('href', 'https://doi.org/10.1038/171737a0')
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'Fotossíntese')
  await expect(reader.getByTestId('html-reader')).toContainText('convertida em energia química')
  expect(await page.evaluate(() => (window as unknown as { hacked?: number }).hacked)).toBeUndefined()
  await reader.getByLabel('Fechar').click()

  reader = await open(page, 'clip.webm')
  await expect(reader.getByTestId('video-reader').locator('video')).toHaveCount(1)
  await reader.getByLabel('Fechar').click()
  expect(await page.locator('video').count()).toBe(0)
  await expectNoErrors(errors)
})

test('link de artigo vira leitura limpa; link de arquivo grande fica só como link e baixa ao abrir', async ({ page }) => {
  const { errors } = await openCanvas(page)
  const ARTICLE = `<html><head><title>Como as plantas respiram</title></head><body><nav>menu</nav><article><h1>Como as plantas respiram</h1>${'<p>As plantas também respiram, consumindo oxigênio dia e noite nas mitocôndrias.</p>'.repeat(12)}<img src="/img/folha.png"></article><footer>rodapé</footer></body></html>`
  const BIG_PDF = makePdf(['Livro grande'])
  let pdfDownloads = 0
  await page.route('**/api/files/head**', (r) => {
    const url = new URL(r.request().url()).searchParams.get('url')!
    return r.fulfill({ json: url.endsWith('.pdf') ? { name: 'livro.pdf', size: 45 * 1024 * 1024, type: 'application/pdf' } : { name: '', size: ARTICLE.length, type: 'text/html' } })
  })
  await page.route('**/api/files/fetch**', (r) => {
    const url = new URL(r.request().url()).searchParams.get('url')!
    if (url.endsWith('.pdf')) {
      pdfDownloads++
      return r.fulfill({ body: BIG_PDF, contentType: 'application/pdf' })
    }
    return r.fulfill({ body: ARTICLE, contentType: 'text/html; charset=utf-8' })
  })

  await page.getByTestId('tools.asset').click()
  await page.getByTestId('media-link').fill('https://blog.exemplo.com/plantas')
  await page.getByTestId('media-link').press('Enter')
  const article = cardByName(page, 'Como as plantas respiram')
  await expect(article).toHaveAttribute('data-status', 'ready')
  let reader = await open(page, 'Como as plantas respiram')
  await expect(reader.getByTestId('html-reader')).toContainText('mitocôndrias')
  await expect(reader.getByTestId('html-reader')).not.toContainText('rodapé')
  await expect(reader.locator('img')).toHaveAttribute('src', 'https://blog.exemplo.com/img/folha.png')
  await expect(reader.getByRole('link', { name: 'Origem ↗' })).toHaveAttribute('href', 'https://blog.exemplo.com/plantas')
  await reader.getByLabel('Fechar').click()

  // colar URL de PDF de 45 MB no canvas: só o link
  await page.evaluate(async () => {
    await window.editor.putExternalContent({ type: 'url', url: 'https://site.com/livro.pdf', sources: [] })
  })
  const pdf = page.locator('[data-testid="file-card"][data-kind="pdf"]')
  await expect(pdf).toHaveAttribute('data-status', 'remote')
  await expect(pdf.getByTestId('file-stats')).toHaveText('Link · 45 MB')
  expect(pdfDownloads).toBe(0)
  reader = await open(page, 'livro.pdf')
  await expect(reader.getByTestId('pdf-reader')).toBeVisible()
  expect(pdfDownloads).toBe(1)
  await expect(pdf.getByTestId('file-stats')).toHaveText('1 página · link')
  await expectNoErrors(errors)
})
