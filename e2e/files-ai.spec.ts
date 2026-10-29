import { expect, test, type Page } from '@playwright/test'
import { file, makeDocx, makePdf, makeWav } from './fixtures'
import { expectNoErrors, openCanvas, plan } from './helpers'

async function upload(page: Page, files: ReturnType<typeof file>[]) {
  await page.getByTestId('tools.asset').click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByTestId('media-upload').click()
  await (await chooser).setFiles(files)
}
const card = (page: Page, kind: string) => page.locator(`[data-testid="file-card"][data-kind="${kind}"]`)
const selectCard = async (page: Page, kind: string) => {
  const id = await card(page, kind).evaluate((el) => el.closest('[data-shape-id]')?.getAttribute('data-shape-id'))
  await page.evaluate((shapeId) => {
    window.editor.select(shapeId as never)
  }, id)
}
const frames = (page: Page) => page.evaluate(() => window.editor.getCurrentPageShapes().filter((s) => s.type === 'frame').map((f) => (f.props as { name: string }).name))

const SUMMARY = { title: 'Resumo', tldr: 'Essência.', sections: [{ heading: 'Parte 1', start: 2, points: ['a', 'b'] }], takeaways: ['c'] }

test('áudio: transcrever (arquivo enviado) e resumir reaproveitando a transcrição', async ({ page }) => {
  const { errors } = await openCanvas(page)
  const calls: { url: string; type: string | null; size: number }[] = []
  await page.route('**/api/files/ai/**', async (r) => {
    const req = r.request()
    calls.push({ url: req.url(), type: req.headers()['content-type'] ?? null, size: req.postDataBuffer()?.length ?? 0 })
    await r.fulfill({ json: { language: 'pt-BR', segments: [{ t: 0, text: 'Olá turma' }, { t: 31, text: 'Hoje: mitocôndrias' }] } })
  })
  let textBody: { text: string } | null = null
  await page.route('**/api/files/ai-text/summary', async (r) => {
    textBody = r.request().postDataJSON()
    await r.fulfill({ json: SUMMARY })
  })

  await upload(page, [file('aula.wav', 'audio/wav', makeWav(2))])
  await expect(card(page, 'audio')).toHaveAttribute('data-status', 'ready')
  await selectCard(page, 'audio')
  await page.getByTestId('file-transcript').click()
  await expect.poll(() => frames(page)).toEqual(['Transcrição · aula.wav'])
  expect(calls[0]).toMatchObject({ type: 'audio/wav' })
  expect(calls[0]!.url).toContain('/api/files/ai/transcript?name=aula.wav')
  expect(calls[0]!.size).toBeGreaterThan(30_000)

  await selectCard(page, 'audio')
  await page.getByTestId('file-summary').click()
  await expect.poll(() => frames(page)).toEqual(['Transcrição · aula.wav', 'Resumo · aula.wav'])
  // resumo saiu do texto da transcrição, sem reenviar o áudio
  expect(calls).toHaveLength(1)
  expect(textBody!.text).toContain('[0:31] Hoje: mitocôndrias')
  await expectNoErrors(errors)
})

test('documentos: PDF vai como arquivo; DOCX vai como texto; erro aparece no cartão', async ({ page }) => {
  await openCanvas(page)
  const fileCalls: string[] = []
  await page.route('**/api/files/ai/**', async (r) => {
    fileCalls.push(r.request().headers()['content-type'] ?? '')
    await r.fulfill({ json: SUMMARY })
  })
  const texts: string[] = []
  await page.route('**/api/files/ai-text/summary', async (r) => {
    texts.push((r.request().postDataJSON() as { text: string }).text)
    await r.fulfill({ status: 502, json: { error: 'gemini 503: sobrecarga' } })
  })

  await upload(page, [
    file('apostila.pdf', 'application/pdf', makePdf(['Capitulo um', 'Capitulo dois'])),
    file('relatorio.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', await makeDocx()),
  ])
  await expect.poll(() => page.locator('[data-testid="file-card"][data-status="ready"]').count()).toBe(2)

  await selectCard(page, 'pdf')
  await expect(page.getByTestId('file-transcript')).toHaveCount(0)
  await page.getByTestId('file-summary').click()
  await expect.poll(() => frames(page)).toEqual(['Resumo · apostila.pdf'])
  expect(fileCalls).toEqual(['application/pdf'])

  await selectCard(page, 'doc')
  await page.getByTestId('file-summary').click()
  await expect(card(page, 'doc').getByTestId('file-ai-error')).toContainText('gemini 503')
  expect(texts[0]).toContain('A célula é a unidade básica da vida')
})

test('perguntar ao documento: o texto completo do arquivo selecionado vai como anexo', async ({ page }) => {
  await openCanvas(page)
  let body: { attachments?: { name: string; text: string }[]; subgraph: { nodes: { props: Record<string, unknown> }[] } } | null = null
  await page.route('**/api/transform', async (r) => {
    body = r.request().postDataJSON()
    await r.fulfill({ json: plan([{ ref: 'n1', kind: 'note', text: 'Resposta', x: 0, y: 0, points: [] }]) })
  })
  await upload(page, [file('livro.pdf', 'application/pdf', makePdf(['Introducao', 'Metodologia', 'Conclusao final']))])
  await expect(card(page, 'pdf')).toHaveAttribute('data-status', 'ready')
  await selectCard(page, 'pdf')
  await page.getByLabel('Prompt para a seleção').fill('Qual é a conclusão?')
  await page.getByLabel('Prompt para a seleção').press('Enter')
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().some((s) => s.type === 'note'))).toBe(true)
  expect(body!.attachments?.[0]?.name).toBe('livro.pdf')
  // texto de TODAS as páginas (não só o trecho do cartão)
  expect(body!.attachments?.[0]?.text).toContain('Conclusao final')
  // ruído do cartão fora do sub-grafo
  expect(body!.subgraph.nodes[0]!.props).not.toHaveProperty('fileId')
})
