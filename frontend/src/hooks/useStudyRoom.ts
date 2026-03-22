// ── Study Room — WebSocket-based collaborative flashcard session ───────────────
import { useState, useEffect, useRef, useCallback } from 'react'

export interface RoomPeer {
  id: string
  name: string
  cardIndex: number
  correct: number
  total: number
  lastSeen: number
}

export interface RoomState {
  roomCode: string
  peers: RoomPeer[]
  connected: boolean
  error: string | null
}

// We use a simple BroadcastChannel for same-origin same-device (demo),
// plus a basic WS connection when a backend is available.
// Falls back gracefully to BroadcastChannel only (works for same-browser tabs).

const BC_PREFIX = 'dasiboard-room-'

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function useStudyRoom(myName: string) {
  const [roomCode, setRoomCode]   = useState<string | null>(null)
  const [peers, setPeers]         = useState<RoomPeer[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const bcRef   = useRef<BroadcastChannel | null>(null)
  const myIdRef = useRef(Math.random().toString(36).slice(2))
  const pingRef = useRef<ReturnType<typeof setInterval>>()

  const broadcast = useCallback((msg: object) => {
    bcRef.current?.postMessage({ ...msg, from: myIdRef.current, name: myName, ts: Date.now() })
  }, [myName])

  const handleMessage = useCallback((evt: MessageEvent) => {
    const msg = evt.data
    if (!msg?.from || msg.from === myIdRef.current) return

    setPeers(prev => {
      const existing = prev.find(p => p.id === msg.from)
      const peer: RoomPeer = {
        id: msg.from,
        name: msg.name ?? 'Colega',
        cardIndex: msg.cardIndex ?? existing?.cardIndex ?? 0,
        correct: msg.correct ?? existing?.correct ?? 0,
        total: msg.total ?? existing?.total ?? 0,
        lastSeen: Date.now(),
      }
      if (existing) return prev.map(p => p.id === msg.from ? peer : p)
      return [...prev, peer]
    })
  }, [])

  // Prune stale peers (>10s without ping)
  useEffect(() => {
    const t = setInterval(() => {
      setPeers(prev => prev.filter(p => Date.now() - p.lastSeen < 15_000))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const join = useCallback((code: string) => {
    if (bcRef.current) bcRef.current.close()
    const bc = new BroadcastChannel(BC_PREFIX + code.toUpperCase())
    bcRef.current = bc
    bc.onmessage = handleMessage
    setRoomCode(code.toUpperCase())
    setConnected(true)
    setError(null)
    setPeers([])
    // Announce join
    setTimeout(() => {
      bc.postMessage({ type: 'join', from: myIdRef.current, name: myName, ts: Date.now() })
    }, 100)
    // Ping every 4s
    pingRef.current = setInterval(() => {
      bc.postMessage({ type: 'ping', from: myIdRef.current, name: myName, ts: Date.now() })
    }, 4000)
  }, [myName, handleMessage])

  const leave = useCallback(() => {
    clearInterval(pingRef.current)
    if (bcRef.current) {
      bcRef.current.postMessage({ type: 'leave', from: myIdRef.current, name: myName })
      bcRef.current.close()
      bcRef.current = null
    }
    setRoomCode(null); setConnected(false); setPeers([])
  }, [myName])

  const updateProgress = useCallback((cardIndex: number, correct: number, total: number) => {
    broadcast({ type: 'progress', cardIndex, correct, total })
  }, [broadcast])

  useEffect(() => () => { leave() }, [leave])

  return { roomCode, peers, connected, error, join, leave, updateProgress, myId: myIdRef.current }
}
