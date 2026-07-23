"use client"

import { useEffect, useState } from "react"
import { useChat } from "@/components/providers/chat-provider"
import type { ParticipantType } from "@/lib/api/chat"
import { AnimatedLoader } from "@/components/animated-loader"
import { ChatPanel } from "./chat-panel"

interface EntityChatPanelProps {
  targetType: ParticipantType
  targetEntityPublicId: string
  className?: string
}

export function EntityChatPanel({ targetType, targetEntityPublicId, className }: EntityChatPanelProps) {
  const { startDirect } = useChat()
  const [publicId, setPublicId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPublicId(null)
    setError(null)
    startDirect(targetType, targetEntityPublicId)
      .then((conv) => {
        if (!cancelled) setPublicId(conv.publicId)
      })
      .catch((err: any) => {
        if (cancelled) return
        let msg = err?.message || "Failed to open chat"
        try {
          const parsed = JSON.parse(msg)
          if (parsed?.message) msg = parsed.message
        } catch {}
        setError(msg)
      })
    return () => {
      cancelled = true
    }
  }, [startDirect, targetType, targetEntityPublicId])

  return (
    <div className={className ?? "h-[calc(100vh-220px)] min-h-[400px] w-full"}>
      {error ? (
        <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
      ) : publicId ? (
        <ChatPanel conversationPublicId={publicId} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <AnimatedLoader size={28} />
        </div>
      )}
    </div>
  )
}
