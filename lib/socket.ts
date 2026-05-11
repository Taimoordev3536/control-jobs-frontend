import { io, Socket } from "socket.io-client"
import { signOut } from "next-auth/react"

const AUTH_ERROR_PATTERNS = ["jwt expired", "invalid token", "unauthorized"]

interface CachedSocket {
  socket: Socket
  refCount: number
}

const cache = new Map<string, CachedSocket>()

export function acquireSocket(accessToken: string): Socket {
  const existing = cache.get(accessToken)
  if (existing) {
    existing.refCount += 1
    return existing.socket
  }

  const url = process.env.NEXT_PUBLIC_API_BASE_URL as string
  const socket = io(url, {
    transports: ["websocket"],
    autoConnect: true,
    auth: { token: accessToken },
  })

  socket.on("connect_error", (err) => {
    const msg = String(err?.message || err || "").toLowerCase()
    if (AUTH_ERROR_PATTERNS.some((p) => msg.includes(p))) {
      signOut({ callbackUrl: "/login" })
    }
  })

  cache.set(accessToken, { socket, refCount: 1 })
  return socket
}

export function releaseSocket(accessToken: string): void {
  const entry = cache.get(accessToken)
  if (!entry) return
  entry.refCount -= 1
  if (entry.refCount <= 0) {
    entry.socket.disconnect()
    cache.delete(accessToken)
  }
}

export function createSocket(accessToken: string): Socket {
  return acquireSocket(accessToken)
}
