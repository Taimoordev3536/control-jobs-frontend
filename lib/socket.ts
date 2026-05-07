import { io, Socket } from "socket.io-client"
import { signOut } from "next-auth/react"

const AUTH_ERROR_PATTERNS = ["jwt expired", "invalid token", "unauthorized"]

export function createSocket(accessToken: string): Socket {
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

  return socket
}
