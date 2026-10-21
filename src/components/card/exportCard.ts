export const PHOTO_WARNING = 'Não deu pra incluir a foto na imagem'

type ExportOptions = { scale?: 2 | 3; face: 'front' | 'back'; onWarn?: (message: string) => void }

const withoutPhoto = (node: Node) => !(node instanceof HTMLImageElement && node.closest('.pcard-photo'))

/** Gera o PNG da carta. A biblioteca só é baixada quando alguém exporta. */
export async function exportCard(node: HTMLElement, { scale, face, onWarn }: ExportOptions): Promise<Blob> {
  const { toBlob } = await import('html-to-image')
  const base = { pixelRatio: scale ?? 3, cacheBust: true }
  const flip = face === 'back' ? 'card--exporting-back' : null
  node.classList.add('card--exporting')
  if (flip) node.classList.add(flip)
  try {
    let blob: Blob | null = null
    try {
      blob = await toBlob(node, base)
    } catch {
      // Foto de outro domínio sem CORS: refaz sem ela (o gradiente da paleta fica no lugar).
      blob = await toBlob(node, { ...base, filter: withoutPhoto })
      onWarn?.(PHOTO_WARNING)
    }
    if (!blob) throw new Error('Não deu pra gerar a imagem')
    return blob
  } finally {
    node.classList.remove('card--exporting')
    if (flip) node.classList.remove(flip)
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
