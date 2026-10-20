import { apiFetch } from './api'

export type PushState = 'unsupported' | 'denied' | 'enabled' | 'available'

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ? registration.pushManager.getSubscription() : null
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    if (Notification.permission === 'granted' && (await currentSubscription())) return 'enabled'
  } catch { /* sem SW registrado: segue como disponível */ }
  return 'available'
}

function toKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Este navegador não suporta avisos.')
  const keyResponse = await apiFetch('/api/push/public-key')
  if (!keyResponse.ok) throw new Error('Os avisos ainda não estão disponíveis.')
  const { publicKey } = (await keyResponse.json()) as { publicKey: string }
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permissão negada.')
  const registration = await navigator.serviceWorker.ready
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }))
  const json = subscription.toJSON()
  const response = await apiFetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  if (!response.ok) {
    await subscription.unsubscribe().catch(() => false)
    throw new Error('Não foi possível ativar os avisos.')
  }
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  await apiFetch('/api/push/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
  await subscription.unsubscribe()
}
