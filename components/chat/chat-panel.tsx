"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCheck,
  ChevronDown,
  Copy,
  CornerUpLeft,
  Forward,
  Info,
  Pencil,
  Pin,
  PinOff,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AnimatedLoader } from "@/components/animated-loader"
import { MessageInfoDialog } from "./message-info-dialog"
import { ForwardDialog } from "./forward-dialog"
import { toast } from "@/hooks/use-toast"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]
import ControlJobsLogo from "@/icons/Logos/ControlJobs.svg"
import { useChat } from "@/components/providers/chat-provider"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import type { ConversationDto, MessageDto } from "@/lib/api/chat"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatTime,
  groupByDay,
  isAllReadByOthers,
} from "./chat-utils"

interface ChatPanelProps {
  conversationPublicId: string
}

const TYPING_DEBOUNCE_MS = 1500

function headerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?"
}

export function ChatPanel({ conversationPublicId }: ChatPanelProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const myUserId = (() => {
    const raw = (session as any)?.user?.id
    const n = raw === undefined || raw === null ? NaN : Number(raw)
    return Number.isFinite(n) ? n : undefined
  })()

  const {
    conversations,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
    markRead,
    subscribeToConversation,
    emitTyping,
    onIncomingMessage,
    onMessageUpdate,
    onReadReceipt,
    onTyping,
    search,
  } = useChat()

  const conversation: ConversationDto | null = useMemo(
    () => conversations.find((c) => c.publicId === conversationPublicId) || null,
    [conversations, conversationPublicId],
  )

  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [typing, setTyping] = useState<{ userName: string | null } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchHits, setSearchHits] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null)
  const [infoMessage, setInfoMessage] = useState<MessageDto | null>(null)
  const [forwardMessage, setForwardMessage] = useState<MessageDto | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMessages([])
    setLoading(true)
    fetchMessages(conversationPublicId)
      .then((rows) => {
        setMessages(rows)
        setLoading(false)
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        })
      })
      .catch(() => setLoading(false))
  }, [conversationPublicId, fetchMessages])

  useEffect(() => {
    const unsubscribe = subscribeToConversation(conversationPublicId)
    return unsubscribe
  }, [conversationPublicId, subscribeToConversation])

  useEffect(() => {
    return onIncomingMessage((msg) => {
      if (msg.conversationPublicId !== conversationPublicId) return
      setMessages((prev) => {
        if (prev.some((m) => m.publicId === msg.publicId)) return prev
        const next = [...prev, msg]
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        })
        return next
      })
    })
  }, [conversationPublicId, onIncomingMessage])

  useEffect(() => {
    return onMessageUpdate((msg) => {
      if (msg.conversationPublicId !== conversationPublicId) return
      setMessages((prev) => prev.map((m) => (m.publicId === msg.publicId ? msg : m)))
    })
  }, [conversationPublicId, onMessageUpdate])

  useEffect(() => {
    return onReadReceipt((data) => {
      if (data.conversationPublicId !== conversationPublicId) return
      setMessages((prev) =>
        prev.map((m) => {
          if (m.readBy.some((r) => r.userId === data.userId)) return m
          return {
            ...m,
            readBy: [...m.readBy, { userId: data.userId, readAt: data.readAt }],
          }
        }),
      )
    })
  }, [conversationPublicId, onReadReceipt])

  useEffect(() => {
    return onTyping(conversationPublicId, (state) => {
      setTyping(state ? { userName: state.userName } : null)
    })
  }, [conversationPublicId, onTyping])

  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (!myUserId) return
    const hasUnreadFromOthers = messages.some(
      (m) =>
        m.senderUserId !== myUserId &&
        !m.deletedAt &&
        !m.readBy.some((r) => r.userId === myUserId),
    )
    if (hasUnreadFromOthers) {
      markRead(conversationPublicId, last.publicId).catch(() => {})
    }
  }, [conversationPublicId, markRead, messages, myUserId])

  const otherUserIds = useMemo(() => {
    if (!conversation || !myUserId) return [] as number[]
    const ids = new Set<number>()
    for (const m of messages) {
      if (m.senderUserId !== myUserId) ids.add(m.senderUserId)
      for (const r of m.readBy) if (r.userId !== myUserId) ids.add(r.userId)
    }
    return [...ids]
  }, [conversation, messages, myUserId])

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (editingId) {
      const messageId = editingId
      setDraft("")
      setEditingId(null)
      setEditDraft("")
      try {
        await editMessage(conversationPublicId, messageId, trimmed)
      } catch (err) {
        console.error(err)
        setDraft(trimmed)
        setEditingId(messageId)
      }
      return
    }
    const replyId = replyTo?.publicId
    setDraft("")
    setReplyTo(null)
    try {
      await sendMessage(conversationPublicId, trimmed, replyId)
    } catch (err) {
      console.error(err)
      setDraft(trimmed)
    }
  }, [conversationPublicId, draft, editingId, editMessage, replyTo, sendMessage])

  const handleCopy = useCallback(async (m: MessageDto) => {
    if (!m.body) return
    try {
      await navigator.clipboard.writeText(m.body)
      toast({ title: t("messageCopied"), variant: "success" })
    } catch (err) {
      console.error(err)
    }
  }, [t])

  const handleTogglePin = useCallback(async (m: MessageDto) => {
    try {
      if (m.pinnedAt) await unpinMessage(conversationPublicId, m.publicId)
      else await pinMessage(conversationPublicId, m.publicId)
    } catch (err) {
      console.error(err)
    }
  }, [conversationPublicId, pinMessage, unpinMessage])

  const handleToggleReaction = useCallback(async (m: MessageDto, emoji: string) => {
    if (!myUserId) return
    const reacted = m.reactions.find((r) => r.emoji === emoji)?.userIds.includes(myUserId)
    try {
      if (reacted) await removeReaction(conversationPublicId, m.publicId, emoji)
      else await addReaction(conversationPublicId, m.publicId, emoji)
    } catch (err) {
      console.error(err)
    }
  }, [conversationPublicId, addReaction, removeReaction, myUserId])

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage(conversationPublicId, messageId)
      } catch (err) {
        console.error(err)
      }
    },
    [conversationPublicId, deleteMessage],
  )

  const handleDraftChange = useCallback(
    (val: string) => {
      setDraft(val)
      if (typingTimerRef.current) return
      emitTyping(conversationPublicId)
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null
      }, TYPING_DEBOUNCE_MS)
    },
    [conversationPublicId, emitTyping],
  )

  const handleSearch = useCallback(
    async (q: string) => {
      setSearchQuery(q)
      if (!q.trim()) {
        setSearchHits(new Set())
        return
      }
      try {
        const results = await search(q, conversationPublicId)
        setSearchHits(new Set(results.map((r) => r.messagePublicId)))
      } catch (err) {
        console.error(err)
      }
    },
    [conversationPublicId, search],
  )

  const dayGroups = useMemo(
    () => groupByDay(messages, t("today"), t("yesterday")),
    [messages, t],
  )
  const showSenderLabels = conversation?.kind === "GROUP"

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="flex h-[54px] flex-shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {conversation?.displayName && (
            <div className="relative flex-shrink-0">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-xs font-semibold text-white">
                {conversation.displayImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={conversation.displayImageUrl}
                    alt={conversation.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  headerInitials(conversation.displayName)
                )}
              </div>
              {conversation.kind === "GROUP" && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-[#662D91]">
                  <Users className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {conversation?.displayName || ""}
            </div>
            {conversation?.kind === "GROUP" && (
              <div className="truncate text-[11px] text-muted-foreground">
                {conversation.participants.map((p) => p.name || p.type).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          aria-label={t("searchMessages")}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("searchMessages")}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm chat-caret focus:outline-none"
          />
          <button
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery("")
              setSearchHits(new Set())
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {messages.some((m) => m.pinnedAt) && (
        <div className="flex flex-shrink-0 items-start gap-2 border-b border-border bg-[#662D91]/5 px-4 py-1.5">
          <Pin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#662D91]" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#662D91]">{t("pinnedMessage")}</div>
            <div className="truncate text-xs text-foreground">
              {messages.find((m) => m.pinnedAt)?.body || ""}
            </div>
          </div>
        </div>
      )}

      <div className="chat-canvas relative flex min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
          <ControlJobsLogo className="chat-watermark-logo h-24 w-auto md:h-32" />
        </div>
        <div ref={scrollRef} className="chat-scrollbar relative z-10 min-h-0 w-full overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <AnimatedLoader size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("noMessages")}
          </div>
        ) : (
          [...dayGroups.entries()].map(([dayKey, dayMessages]) => {
            return (
              <div key={dayKey} className="w-full">
                <div className="my-2 flex w-full justify-center">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">
                    {dayKey}
                  </span>
                </div>
                {dayMessages.map((m) => {
                  const isMine = myUserId !== undefined && m.senderUserId === myUserId
                  const isHit = searchHits.has(m.publicId)
                  const isEditing = editingId === m.publicId
                  const readByOthers = isAllReadByOthers(m, conversation, myUserId || -1, otherUserIds)
                  return (
                    <div
                      key={m.publicId}
                      className={`group flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"} ${m.reactions.length > 0 && !m.deletedAt ? "mb-4" : "mb-1"}`}
                    >
                      {isMine && !m.deletedAt && !isEditing && (
                        <ReactionTrigger
                          message={m}
                          myUserId={myUserId}
                          onToggle={handleToggleReaction}
                          align="end"
                        />
                      )}
                      <div
                        className={`relative max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                          isMine
                            ? "bg-[#662D91] text-white"
                            : "bg-card text-foreground border border-border"
                        } ${isHit ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {!m.deletedAt && !isEditing && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`absolute right-1 top-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                                  isMine ? "bg-black/15 text-white hover:bg-black/25" : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                                aria-label="message actions"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[7.5rem] p-1">
                              {isMine && (
                                <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => setInfoMessage(m)}>
                                  <Info className="mr-1.5 h-3.5 w-3.5" />
                                  {t("messageInfo")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => setReplyTo(m)}>
                                <CornerUpLeft className="mr-1.5 h-3.5 w-3.5" />
                                {t("reply")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => handleCopy(m)}>
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                {t("copy")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => setForwardMessage(m)}>
                                <Forward className="mr-1.5 h-3.5 w-3.5" />
                                {t("forward")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => handleTogglePin(m)}>
                                {m.pinnedAt ? (
                                  <PinOff className="mr-1.5 h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                {m.pinnedAt ? t("unpin") : t("pin")}
                              </DropdownMenuItem>
                              {isMine && (
                                <>
                                  <DropdownMenuItem
                                    className="px-2 py-1 text-xs"
                                    onClick={() => {
                                      setEditingId(m.publicId)
                                      setDraft(m.body || "")
                                      setReplyTo(null)
                                    }}
                                  >
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                    {t("editMessage")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="px-2 py-1 text-xs" onClick={() => handleDelete(m.publicId)}>
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    {t("deleteMessage")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {!isMine && showSenderLabels && (
                          <div className="mb-0.5 text-[11px] font-medium opacity-80">
                            {m.senderUserName || "?"}
                          </div>
                        )}
                        {m.repliedTo && (
                          <div
                            className={`mb-1 rounded border-l-2 px-2 py-1 text-[11px] ${
                              isMine
                                ? "border-white/60 bg-white/10"
                                : "border-[#662D91] bg-muted"
                            }`}
                          >
                            <div className="font-semibold opacity-90">{m.repliedTo.senderUserName || "?"}</div>
                            <div className="truncate opacity-80">
                              {m.repliedTo.deletedAt ? <span className="italic">{t("messageDeleted")}</span> : m.repliedTo.body}
                            </div>
                          </div>
                        )}
                        {m.pinnedAt && (
                          <div className={`mb-0.5 flex items-center gap-1 text-[10px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
                            <Pin className="h-3 w-3" />
                            <span>{t("pinnedMessage")}</span>
                          </div>
                        )}
                        {m.deletedAt ? (
                          <span className="italic opacity-70">{t("messageDeleted")}</span>
                        ) : (
                          <div className={`whitespace-pre-wrap break-words ${isEditing ? "opacity-60" : ""}`}>{m.body}</div>
                        )}
                        <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${isMine ? "text-white/80" : "text-muted-foreground"}`}>
                          <span>{formatTime(new Date(m.createdAt))}</span>
                          {m.editedAt && !m.deletedAt && <span>· {t("edited")}</span>}
                          {isMine && !m.deletedAt && (
                            readByOthers ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                            ) : (
                              <CheckCheck className="h-3.5 w-3.5 opacity-60" />
                            )
                          )}
                        </div>
                        {m.reactions.length > 0 && !m.deletedAt && (
                          <div
                            className={`absolute -bottom-3 flex items-center gap-0.5 ${
                              isMine ? "left-2" : "right-2"
                            }`}
                          >
                            {m.reactions.map((r) => {
                              const mine = myUserId !== undefined && r.userIds.includes(myUserId)
                              return (
                                <button
                                  key={r.emoji}
                                  onClick={() => handleToggleReaction(m, r.emoji)}
                                  className={`flex items-center gap-0.5 rounded-full border bg-card px-1.5 py-0.5 shadow-sm transition-colors ${
                                    mine
                                      ? "border-[#662D91]"
                                      : "border-border hover:bg-accent"
                                  }`}
                                >
                                  <span className="text-xs leading-none">{r.emoji}</span>
                                  {r.count > 1 && (
                                    <span className="text-[10px] leading-none text-muted-foreground">{r.count}</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {!isMine && !m.deletedAt && !isEditing && (
                        <ReactionTrigger
                          message={m}
                          myUserId={myUserId}
                          onToggle={handleToggleReaction}
                          align="start"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })
        )}
        </div>
      </div>

      {typing && (
        <div className="px-4 pb-1 text-xs italic text-muted-foreground">
          {typing.userName ? `${typing.userName} ${t("isTyping")}` : t("isTyping")}
        </div>
      )}

      {replyTo && (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-border bg-card px-3 py-2">
          <div className="rounded border-l-2 border-[#662D91] bg-muted px-2 py-1 flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#662D91]">
              {t("replyingTo")} {replyTo.senderUserName || ""}
            </div>
            <div className="truncate text-xs text-muted-foreground">{replyTo.body}</div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editingId && (
        <div className="flex flex-shrink-0 items-start gap-2 border-t border-border bg-card px-3 py-2">
          <Pencil className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#662D91]" />
          <div className="rounded border-l-2 border-[#662D91] bg-muted px-2 py-1 flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[#662D91]">
              {t("editMessage")}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {messages.find((m) => m.publicId === editingId)?.body || ""}
            </div>
          </div>
          <button
            onClick={() => {
              setEditingId(null)
              setEditDraft("")
              setDraft("")
            }}
            className="mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex min-h-12 flex-shrink-0 items-end gap-2 bg-card px-3 py-2 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.08)]">
        <textarea
          rows={1}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = "auto"
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={t("typeMessage")}
          className="chat-scrollbar max-h-40 min-h-8 flex-1 resize-none overflow-y-auto rounded-md border border-border bg-background px-3 py-1 text-sm leading-6 chat-caret focus:outline-none"
        />
        <Button
          onClick={handleSend}
          disabled={!draft.trim()}
          size="icon"
          className="h-8 w-8 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <MessageInfoDialog
        open={!!infoMessage}
        onOpenChange={(o) => !o && setInfoMessage(null)}
        message={infoMessage}
      />
      <ForwardDialog
        open={!!forwardMessage}
        onOpenChange={(o) => !o && setForwardMessage(null)}
        message={forwardMessage}
      />
    </div>
  )
}

interface ReactionTriggerProps {
  message: MessageDto
  myUserId: number | undefined
  onToggle: (m: MessageDto, emoji: string) => void
  align: "start" | "end"
}

function ReactionTrigger({ message, myUserId, onToggle, align }: ReactionTriggerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
          aria-label="add reaction"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align={align}
        className="w-auto rounded-full border-border bg-card p-1 shadow-lg"
      >
        <div className="flex items-center gap-1">
          {QUICK_REACTIONS.map((emoji) => {
            const mine =
              myUserId !== undefined &&
              (message.reactions.find((r) => r.emoji === emoji)?.userIds.includes(myUserId) ?? false)
            return (
              <button
                key={emoji}
                onClick={() => onToggle(message, emoji)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 ${
                  mine ? "bg-[#662D91]/20" : ""
                }`}
              >
                {emoji}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
