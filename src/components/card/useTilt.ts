import { useEffect, useState, type CSSProperties, type RefObject } from 'react'

type PermissionedOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Inclinação da carta: mouse no desktop, deviceorientation no celular. Desligado com reduced motion.
 * No iOS o sensor só abre depois de um toque explícito: `requestMotionPermission` existe só nesse caso.
 */
export function useTilt(ref: RefObject<HTMLElement | null>, { enabled }: { enabled: boolean }): { style: CSSProperties; requestMotionPermission?: () => Promise<void> } {
  const [pose, setPose] = useState<{ x: number; y: number; on: boolean }>({ x: 0.5, y: 0.5, on: false })
  const [sensor, setSensor] = useState(false)
  const active = enabled && !reducedMotion()
  const gated = active && typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as PermissionedOrientation).requestPermission === 'function'
  const needsPermission = gated && !sensor

  useEffect(() => {
    const node = ref.current
    if (!active || !node) return
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const rect = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      setPose({ x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1), on: true })
    }
    const onLeave = () => setPose({ x: 0.5, y: 0.5, on: false })
    node.addEventListener('pointermove', onMove)
    node.addEventListener('pointerleave', onLeave)
    return () => {
      node.removeEventListener('pointermove', onMove)
      node.removeEventListener('pointerleave', onLeave)
    }
  }, [ref, active])

  useEffect(() => {
    if (!active || typeof DeviceOrientationEvent === 'undefined' || needsPermission) return
    const onOrient = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return
      setPose({ x: clamp(0.5 + event.gamma / 60, 0, 1), y: clamp(0.5 + (event.beta - 45) / 60, 0, 1), on: true })
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [active, needsPermission])

  const requestMotionPermission = needsPermission
    ? async () => {
        try {
          const result = await (DeviceOrientationEvent as PermissionedOrientation).requestPermission?.()
          if (result === 'granted') setSensor(true)
        } catch { /* o usuário negou: a carta fica parada */ }
      }
    : undefined

  const style = {
    '--mx': `${pose.x * 100}%`,
    '--my': `${pose.y * 100}%`,
    '--fx': `${pose.x * 100}%`,
    '--shine': pose.on ? 1 : 0,
    transform: active && pose.on ? `rotateY(${(pose.x - 0.5) * 16}deg) rotateX(${(0.5 - pose.y) * 12}deg)` : undefined,
  } as CSSProperties

  return { style, requestMotionPermission }
}
