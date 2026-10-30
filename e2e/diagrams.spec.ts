import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

const G = (ref: string, text: string, role: string, extra = {}) => ({ ref, kind: 'geo', text, x: 0, y: 0, points: [], role, ...extra })
const T = (ref: string, text: string, role: string) => ({ ref, kind: 'text', text, x: 0, y: 0, points: [], role })
const plan = (layout: object, create: object[], connect: object[]) => ({
  plan: { design: '', summary: 'ok', delete: [], update: [], create, connect, layout },
  warnings: [],
})

async function generate(page: import('@playwright/test').Page, body: object) {
  await page.route('**/api/transform', (r) => r.fulfill({ json: body }))
  await page.mouse.click(700, 400)
  await page.keyboard.press('/')
  await page.getByLabel('Prompt para a seleção').fill('diagrama')
  await page.keyboard.press('Enter')
}

/** Pares de caixas (formas/textos) que se sobrepõem — layout determinístico deve dar zero. */
const overlaps = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const ed = window.editor
    const boxes = ed
      .getCurrentPageShapes()
      .filter((s) => s.type === 'geo' || s.type === 'text')
      .map((s) => ed.getShapePageBounds(s)!)
      .filter((b) => b.w > 20 && b.h > 20)
    let n = 0
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i]!.collides(boxes[j]!)) n++
    return n
  })

test('mapa mental: layout balanceado, sem sobreposição, ramos coloridos e conectores sem ponta', async ({ page }) => {
  const { errors } = await openCanvas(page)
  const create = [G('r', 'Fotossíntese', 'accent', { geo: 'ellipse' })]
  const connect: object[] = []
  for (let i = 1; i <= 4; i++) {
    create.push(G(`b${i}`, `Ramo ${i}`, 'primary'))
    connect.push({ from: 'r', to: `b${i}` })
    for (let j = 1; j <= 3; j++) {
      create.push(T(`b${i}${j}`, `Folha ${i}.${j}`, 'body'))
      connect.push({ from: `b${i}`, to: `b${i}${j}` })
    }
  }
  await generate(page, plan({ type: 'mindmap', root: 'r', branchColors: true }, create, connect))
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBe(17 + 16)
  expect(await overlaps(page)).toBe(0)
  const info = await page.evaluate(() => {
    const ed = window.editor
    const shapes = ed.getCurrentPageShapes()
    const arrows = shapes.filter((s) => s.type === 'arrow') as import('tldraw').TLArrowShape[]
    const root = shapes.find((s) => s.type === 'geo' && (s.props as { geo: string }).geo === 'ellipse')!
    const cx = ed.getShapePageBounds(root)!.center.x
    const branches = shapes.filter((s) => s.type === 'geo' && s.id !== root.id)
    return {
      heads: [...new Set(arrows.map((a) => a.props.arrowheadEnd))],
      kinds: [...new Set(arrows.map((a) => a.props.kind))],
      left: branches.filter((b) => ed.getShapePageBounds(b)!.center.x < cx).length,
      right: branches.filter((b) => ed.getShapePageBounds(b)!.center.x > cx).length,
      colors: new Set(branches.map((b) => (b.props as { color: string }).color)).size,
    }
  })
  expect(info.heads).toEqual(['none'])
  expect(info.kinds).toEqual(['elbow'])
  expect(info.left).toBe(2)
  expect(info.right).toBe(2)
  expect(info.colors).toBe(4)
  await expectNoErrors(errors)
})

test('linha do tempo: eixo e marcadores desenhados, eventos em ordem cronológica', async ({ page }) => {
  const { errors } = await openCanvas(page)
  const ev = ['1789\nRevolução', '1799\nBrumário', '1804\nImpério', '1815\nWaterloo']
  await generate(
    page,
    plan(
      { type: 'timeline' },
      ev.map((t, i) => G(`e${i}`, t, 'primary')),
      ev.slice(1).map((_, i) => ({ from: `e${i}`, to: `e${i + 1}` })),
    ),
  )
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().filter((s) => s.type === 'line').length)).toBe(5)
  const xs = await page.evaluate(() => {
    const ed = window.editor
    return ed
      .getCurrentPageShapes()
      .filter((s) => s.type === 'geo' && ed.getShapePageBounds(s)!.w > 40)
      .map((s) => ({ t: ed.getShapeUtil(s).getText(s) ?? '', x: ed.getShapePageBounds(s)!.center.x }))
      .sort((a, b) => a.x - b.x)
      .map((e) => e.t.slice(0, 4))
  })
  expect(xs).toEqual(['1789', '1799', '1804', '1815'])
  expect(await page.evaluate(() => window.editor.getCurrentPageShapes().filter((s) => s.type === 'arrow').length)).toBe(0)
  expect(await overlaps(page)).toBe(0)
  await expectNoErrors(errors)
})
