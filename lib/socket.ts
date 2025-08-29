import { io, Socket } from "socket.io-client";

export function createSocket(accessToken: string): Socket {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL as string
  const socket = io(url, {
    transports: ["websocket"],
    autoConnect: true,
    auth: { token: accessToken },
    // extraHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  // Dev logs to help diagnose connection issues
  socket.on("connect", () => {
    // eslint-disable-next-line no-console
    console.log("[WS] connected", socket.id)
  })
  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[WS] connect_error", err?.message || err)
  })
  socket.on("disconnect", (reason) => {
    // eslint-disable-next-line no-console
    console.warn("[WS] disconnected", reason)
  })
  return socket
}


