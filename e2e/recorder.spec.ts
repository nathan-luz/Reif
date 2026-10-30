import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

test.use({
  permissions: ['microphone'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

test('gravar áudio pelo microfone vira cartão de áudio', async ({ page }) => {
  const { errors } = await openCanvas(page)
  await page.getByTestId('tools.asset').click()
  await page.getByTestId('media-record').click()
  await expect(page.getByTestId('recorder')).toContainText('0:0')
  await page.waitForTimeout(1500)
  await page.getByTestId('record-stop').click()
  const card = page.locator('[data-testid="file-card"][data-kind="audio"]')
  await expect(card).toHaveAttribute('data-status', 'ready')
  await expect(card).toContainText('Nota de voz')
  await expectNoErrors(errors)
})
