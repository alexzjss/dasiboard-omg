import { describe, expect, it } from 'vitest'
import { clampCrop, cropRect } from './crop'

describe('crop', () => {
  it('mantém o quadrado dentro da imagem com zoom 1', () => {
    const state = clampCrop({ zoom: 1, x: 0.9, y: 0 }, 1000, 500)
    const r = cropRect(state, 1000, 500)
    expect(r.size).toBe(500)
    expect(r.sx).toBeGreaterThanOrEqual(0)
    expect(r.sx + r.size).toBeLessThanOrEqual(1000)
    expect(r.sy).toBe(0)
  })

  it('limita deslocamentos extremos às bordas', () => {
    const r = cropRect(clampCrop({ zoom: 2, x: 5, y: -5 }, 1000, 500), 1000, 500)
    expect(r.size).toBe(250)
    expect(r.sx).toBe(750)
    expect(r.sy).toBe(0)
  })

  it('o zoom 2 reduz o lado do recorte pela metade', () => {
    expect(cropRect({ zoom: 2, x: 0, y: 0 }, 1000, 500).size).toBe(250)
  })

  it('zoom abaixo de 1 vira 1 e acima de 4 vira 4', () => {
    expect(clampCrop({ zoom: 0.5, x: 0, y: 0 }, 800, 800).zoom).toBe(1)
    expect(clampCrop({ zoom: 9, x: 0, y: 0 }, 800, 800).zoom).toBe(4)
  })

  it('centraliza com deslocamento zero', () => {
    const r = cropRect({ zoom: 1, x: 0, y: 0 }, 1000, 500)
    expect(r.sx).toBe(250)
  })
})
