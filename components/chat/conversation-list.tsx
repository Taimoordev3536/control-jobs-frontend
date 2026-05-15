"use client"

import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"
import type { ConversationDto } from "@/lib/api/chat"
import { useChat } from "@/components/providers/chat-provider"
import { useTranslation } from "@/hooks/use-translation"
import { AnimatedLoader } from "@/components/animated-loader"
import { groupInitials } from "./chat-utils"

interface ConversationListProps {
  conversations: ConversationDto[]
  activePublicId?: string
  onSelect: (publicId: string) => void
}

function formatListTime(date: string | null): string {
  if (!date) return ""
  const d = new Date(date)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - 6)

  if (d >= startOfToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (d >= startOfYesterday) return "Ayer"
  if (d >= startOfWeek) return d.toLocaleDateString([], { weekday: "long" })
  return d.toLocaleDateString()
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?"
}

export function ConversationList({ conversations, activePublicId, onSelect }: ConversationListProps) {
  const { t } = useTranslation()
  const { isReady } = useChat()
  const [query, setQuery] = useState("")
  const isLoading = !isReady && conversations.length === 0

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.toLowerCase()
    return conversations.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        (c.lastMessage?.body || "").toLowerCase().includes(q),
    )
  }, [conversations, query])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-shrink-0 border-b border-border bg-card px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchConversations")}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs chat-caret focus:border-[#662D91] focus:outline-none"
          />
        </div>
      </div>
      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <AnimatedLoader size={24} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            {t("noConversations")}
          </div>
        ) : (
          <div className="space-y-0.5 px-2 py-2">
            {filtered.map((c) => {
              const isActive = c.publicId === activePublicId
              const preview = c.lastMessage?.deletedAt
                ? t("messageDeleted")
                : c.lastMessage?.body
                  ? c.lastMessage.body
                  : c.lastMessage?.firstAttachmentKind === "IMAGE"
                    ? (c.lastMessage.attachmentCount > 1
                        ? `📷 ${c.lastMessage.attachmentCount} ${t("photos") || "fotos"}`
                        : `📷 ${t("photo") || "Foto"}`)
                    : c.lastMessage?.firstAttachmentKind === "PDF"
                      ? `📎 ${c.lastMessage.firstAttachmentName || "documento.pdf"}`
                      : ""
              return (
                <button
                  key={c.publicId}
                  onClick={() => onSelect(c.publicId)}
                  className={`chat-list-item ${isActive ? "active" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-xs font-semibold text-white">
                      {c.displayImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.displayImageUrl}
                          alt={c.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : c.kind === "GROUP" ? (
                        groupInitials(c.displayName)
                      ) : (
                        initials(c.displayName)
                      )}
                    </div>
                    {c.kind === "GROUP" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-[#662D91]">
                        <Users className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {c.displayName}
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                        {formatListTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">{preview}</span>
                      {c.unreadCount > 0 && (
                        <span className="flex-shrink-0 rounded-full bg-[#662D91] px-1.5 text-[10px] font-semibold text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
