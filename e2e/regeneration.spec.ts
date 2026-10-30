import { expect, test } from '@playwright/test'
import { expectNoErrors, openCanvas } from './helpers'

const G = (ref: string, text: string, role: string, extra = {}) => ({ ref, kind: 'geo', text, x: 0, y: 0, points: [], role, ...extra })
const T = (ref: string, text: string, role: string) => ({ ref, kind: 'text', text, x: 0, y: 0, points: [], role })

/** Mapa base: raiz + 4 áreas, cada uma com 2-3 matérias (texto). */
function basePlan() {
  const areas: Record<string, string[]> = {
    'Ciências da Natureza': ['Biologia', 'Química', 'Física'],
    Linguagens: ['Português', 'Literatura'],
    Matemática: ['Álgebra', 'Geometria'],
    'Ciências Humanas': ['História', 'Geografia'],
  }
  const create = [G('r', 'Matérias do ENEM', 'accent', { geo: 'ellipse' })]
  const connect: object[] = []
  Object.entries(areas).forEach(([area, subs], i) => {
    create.push(G(`a${i}`, area, 'primary'))
    connect.push({ from: 'r', to: `a${i}` })
    subs.forEach((s, j) => {
      create.push(T(`a${i}s${j}`, s, 'body'))
      connect.push({ from: `a${i}`, to: `a${i}s${j}` })
    })
  })
  return { design: '', summary: 'ok', delete: [], update: [], create, connect, layout: { type: 'mindmap', root: 'r', branchColors: true } }
}

test('regeração: expandir um nó envia o contexto do board e reorganiza o mapa sem sobreposição', async ({ page }) => {
  const { errors } = await openCanvas(page)
  let sent: { subgraph: { nodes: { id: string }[]; context?: { diagram?: { topic: string; path: string[] } } } } | null = null
  await page.route('**/api/transform', async (r) => {
    const body = r.request().postDataJSON()
    if (!body.subgraph.nodes.length) return r.fulfill({ json: { plan: basePlan(), warnings: [] } })
    sent = body
    const id = body.subgraph.nodes[0].id
    const kids = ['Ecologia', 'Genética', 'Citologia', 'Evolução', 'Fisiologia']
    return r.fulfill({
      json: {
        plan: {
          design: '', summary: 'ok', delete: [], update: [],
          create: [...kids.map((k, i) => T(`c${i}`, k, 'body')), T('g0', 'Leis de Mendel', 'muted'), T('g1', 'Heredogramas', 'muted')],
          connect: [...kids.map((_, i) => ({ from: id, to: `c${i}` })), { from: 'c1', to: 'g0' }, { from: 'c1', to: 'g1' }],
          layout: { type: 'mindmap', root: id },
        },
        warnings: [],
      },
    })
  })

  await page.mouse.click(700, 400)
  await page.keyboard.press('/')
  await page.getByLabel('Prompt para a seleção').fill('mapa mental das matérias do ENEM')
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBeGreaterThan(20)

  const before = await page.evaluate(() => {
    const ed = window.editor
    const find = (t: string) => ed.getCurrentPageShapes().find((s) => ed.getShapeUtil(s).getText(s) === t)!
    const bio = find('Biologia')
    ed.select(bio.id)
    const root = ed.getShapePageBounds(find('Matérias do ENEM'))!
    return { rootX: root.x, rootY: root.y, count: ed.getCurrentPageShapes().length }
  })
  await page.keyboard.press('/')
  await page.getByLabel('Prompt para a seleção').fill('Adicione os principais conteúdos cobrados desta matéria')
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBe(before.count + 14)

  // Contexto: o pedido curto chega com o tema do mapa e o caminho até o nó.
  expect(sent!.subgraph.context?.diagram?.topic).toBe('Matérias do ENEM')
  expect(sent!.subgraph.context?.diagram?.path).toEqual(['Matérias do ENEM', 'Ciências da Natureza', 'Biologia'])

  const after = await page.evaluate(() => {
    const ed = window.editor
    const shapes = ed.getCurrentPageShapes()
    const find = (t: string) => shapes.find((s) => ed.getShapeUtil(s).getText(s) === t)!
    const b = (t: string) => ed.getShapePageBounds(find(t))!
    const boxes = shapes.filter((s) => s.type === 'geo' || s.type === 'text').map((s) => ed.getShapePageBounds(s)!)
    let ov = 0
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxes[i]!.collides(boxes[j]!)) ov++
    const root = b('Matérias do ENEM')
    // "Para fora": do mesmo lado da raiz que Biologia e mais distante dela.
    const out = (t: string) => (b(t).center.x - root.center.x) * Math.sign(b('Biologia').center.x - root.center.x)
    return {
      ov,
      root: { x: root.x, y: root.y },
      outward: out('Ecologia') > out('Biologia') + b('Biologia').w / 2,
      ecoColor: (find('Ecologia').props as { color: string }).color,
      bioColor: (find('Biologia').props as { color: string }).color,
    }
  })
  expect(after.ov).toBe(0)
  expect(after.root).toEqual({ x: before.rootX, y: before.rootY })
  expect(after.outward).toBe(true) // cresce para fora, do lado do ramo
  expect(after.ecoColor).toBe(after.bioColor) // herda a cor do ramo

  // Um Ctrl+Z desfaz tudo (nós novos e deslocamentos).
  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => page.evaluate(() => window.editor.getCurrentPageShapes().length)).toBe(before.count)
  await expectNoErrors(errors)
})
