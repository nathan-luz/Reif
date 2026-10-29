import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

test('colar URL do YouTube cria o shape leve; resumo vira frame ligado ao vídeo', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await page.route('**/api/youtube/meta/**', (r) => r.fulfill({ json: { title: 'Aula de Fotossíntese' } }))
  await page.route('**/api/youtube/summary', (r) =>
    r.fulfill({
      json: {
        title: 'Fotossíntese',
        tldr: 'Plantas convertem luz em energia.',
        sections: [{ heading: 'Fase clara', start: 95, points: ['Depende de luz', 'Libera O2'] }],
        takeaways: ['Base da cadeia alimentar'],
      },
    }),
  )

  await page.evaluate(async () => {
    await window.editor.putExternalContent({ type: 'url', url: 'https://youtu.be/dQw4w9WgXcQ?t=42', sources: [] })
  })
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().find((s) => s.type === 'youtube')?.props)).toMatchObject({
    videoId: 'dQw4w9WgXcQ',
    start: 42,
    title: 'Aula de Fotossíntese',
  })
  // leve: thumbnail, sem iframe enquanto não houver duplo-clique
  await expect(page.locator('iframe')).toHaveCount(0)

  await page.getByTestId('yt-summary').click()
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().filter((s) => s.type === 'frame').map((f) => (f.props as { name: string }).name))).toEqual([
    'Resumo · Aula de Fotossíntese',
  ])
  await expectNoErrors(errors)
})
