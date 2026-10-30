/**
 * Remove o fundo liso de uma ilustração gerada (branco ou preto), por inundação a partir
 * das bordas: só o fundo conectado à moldura some — brancos internos (ex.: esclera do olho)
 * ficam. Borda suavizada para a imagem "pousar" no papel.
 */
export async function removeBackground(src: string, mode: 'light' | 'dark' | 'none'): Promise<Blob> {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await img.decode()
  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  if (mode !== 'none') {
    const data = ctx.getImageData(0, 0, w, h)
    keyOut(data.data, w, h, mode)
    ctx.putImageData(data, 0, 0)
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'))
}

/** Exportada para teste: zera o alfa do fundo (in-place). */
export function keyOut(px: Uint8ClampedArray, w: number, h: number, mode: 'light' | 'dark') {
  // Cor de referência: mediana das bordas (o "papel" que o modelo desenhou).
  const border: number[][] = []
  for (let x = 0; x < w; x += 4) border.push(rgb(px, x, 0, w), rgb(px, x, h - 1, w))
  for (let y = 0; y < h; y += 4) border.push(rgb(px, 0, y, w), rgb(px, w - 1, y, w))
  const ref = [0, 1, 2].map((i) => median(border.map((c) => c[i]!)))
  const bgLum = (ref[0]! + ref[1]! + ref[2]!) / 3
  if (mode === 'light' ? bgLum < 170 : bgLum > 90) return // fundo não é liso/claro o bastante: não arrisca

  const near = (i: number, tol: number) =>
    Math.abs(px[i]! - ref[0]!) + Math.abs(px[i + 1]! - ref[1]!) + Math.abs(px[i + 2]! - ref[2]!) <= tol
  const TOL = 60
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const k = y * w + x
    if (seen[k] || !near(k * 4, TOL)) return
    seen[k] = 1
    stack.push(k)
  }
  for (let x = 0; x < w; x++) {
    push(x, 0)
    push(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }
  while (stack.length) {
    const k = stack.pop()!
    const x = k % w
    const y = (k - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  for (let k = 0; k < w * h; k++) {
    if (!seen[k]) continue
    const i = k * 4
    // Borda suave: quanto mais distante do fundo, mais opaco (antisserrilhado preservado).
    const d = Math.abs(px[i]! - ref[0]!) + Math.abs(px[i + 1]! - ref[1]!) + Math.abs(px[i + 2]! - ref[2]!)
    px[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (d - 18) / (TOL - 18))) * 0.9)
  }
}

const rgb = (px: Uint8ClampedArray, x: number, y: number, w: number) => {
  const i = (y * w + x) * 4
  return [px[i]!, px[i + 1]!, px[i + 2]!]
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 255
