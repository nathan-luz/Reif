import { expect, type Page } from '@playwright/test'
import type { Editor } from 'tldraw'

declare global {
  interface Window {
    editor: Editor
  }
}

/** Abre o app com storage limpo (cada teste roda num contexto novo) e espera o editor. */
export async function openCanvas(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.editor))
  return { errors }
}

export const shapeTypes = (page: Page) =>
  page.evaluate(() => window.editor.getCurrentPageShapes().map((s) => s.type).sort())

export async function expectNoErrors(errors: string[]) {
  expect(errors, errors.join('\n')).toEqual([])
}

export const plan = (create: object[], extra: object = {}) => ({
  plan: { summary: 'ok', delete: [], update: [], connect: [], create, ...extra },
  warnings: [],
})
