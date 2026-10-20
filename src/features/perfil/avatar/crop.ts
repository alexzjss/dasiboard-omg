export type CropState = { zoom: number; x: number; y: number }

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4
export const AVATAR_SIZE = 512

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** `zoom` entre 1 e 4; `x`/`y` entre -1 e 1 (0 = centralizado, ±1 = encostado na borda). */
export function clampCrop(state: CropState, imageW: number, imageH: number): CropState {
  void imageW
  void imageH
  const zoom = Number.isFinite(state.zoom) ? clamp(state.zoom, MIN_ZOOM, MAX_ZOOM) : MIN_ZOOM
  return {
    zoom,
    x: Number.isFinite(state.x) ? clamp(state.x, -1, 1) : 0,
    y: Number.isFinite(state.y) ? clamp(state.y, -1, 1) : 0,
  }
}

/** Quadrado de origem, em pixels da imagem, que a prévia mostra. */
export function cropRect(state: CropState, imageW: number, imageH: number): { sx: number; sy: number; size: number } {
  const s = clampCrop(state, imageW, imageH)
  const size = Math.min(imageW, imageH) / s.zoom
  const sx = ((imageW - size) / 2) * (1 + s.x)
  const sy = ((imageH - size) / 2) * (1 + s.y)
  return { sx, sy, size }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** Recorta e reduz para 512×512. WebP; JPEG quando o navegador não sabe gerar WebP. */
export async function renderAvatar(img: HTMLImageElement, state: CropState): Promise<Blob> {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const { sx, sy, size } = cropRect(state, w, h)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  const webp = await toBlob(canvas, 'image/webp', 0.86)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.86)
  if (!jpeg) throw new Error('Não foi possível gerar a imagem')
  return jpeg
}
