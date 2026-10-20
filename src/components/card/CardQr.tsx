import { useMemo, type CSSProperties } from 'react'
import qrcode from 'qrcode-generator'

/** QR em SVG (correção M), desenhado como um único path. A cor vai por style para aceitar color-mix(). */
export function CardQr({ value, size, color }: { value: string; size: number; color: string }) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`
    }
    return { count: n, path: d }
  }, [value])

  return (
    <svg className="card-qr" viewBox={`0 0 ${count} ${count}`} width={size} height={size} role="img" aria-label="QR code da carta" shapeRendering="crispEdges" style={{ fill: color } as CSSProperties}>
      <path d={path} />
    </svg>
  )
}
