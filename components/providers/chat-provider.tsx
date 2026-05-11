"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { Socket } from "socket.io-client"
import { useAuth } from "@/hooks/use-auth"
import { acquireSocket, releaseSocket } from "@/lib/socket"
import {
  ContactGroup,
  ConversationDto,
  MessageDto,
  ParticipantType,
  SearchResultDto,
  createDirectConversation,
  createGroupConversation,
  deleteMessage as apiDeleteMessage,
  editMessage as apiEditMessage,
  getUnreadCount,
  listContacts,
  listConversations,
  listMessages as apiListMessages,
  listPinnedMessages as apiListPinned,
  markRead as apiMarkRead,
  pinMessage as apiPinMessage,
  addReaction as apiAddReaction,
  removeReaction as apiRemoveReaction,
  searchMessages as apiSearchMessages,
  sendMessage as apiSendMessage,
  unpinMessage as apiUnpinMessage,
} from "@/lib/api/chat"

interface TypingState {
  userId: number
  userName: string | null
  expiresAt: number
}

interface ChatContextValue {
  conversations: ConversationDto[]
  unreadCount: number
  isReady: boolean
  refreshConversations: () => Promise<void>
  fetchMessages: (publicId: string, before?: string) => Promise<MessageDto[]>
  sendMessage: (publicId: string, body: string, repliedToMessagePublicId?: string) => Promise<MessageDto>
  editMessage: (publicId: string, messageId: string, body: string) => Promise<MessageDto>
  deleteMessage: (publicId: string, messageId: string) => Promise<MessageDto>
  pinMessage: (publicId: string, messageId: string) => Promise<MessageDto>
  unpinMessage: (publicId: string, messageId: string) => Promise<MessageDto>
  listPinnedMessages: (publicId: string) => Promise<MessageDto[]>
  addReaction: (publicId: string, messageId: string, emoji: string) => Promise<MessageDto>
  removeReaction: (publicId: string, messageId: string, emoji: string) => Promise<MessageDto>
  markRead: (publicId: string, upToMessagePublicId: string) => Promise<void>
  startDirect: (targetType: ParticipantType, targetEntityPublicId: string) => Promise<ConversationDto>
  startGroup: (payload: {
    employerPublicId: string
    clientPublicId: string
    workerPublicId: string
  }) => Promise<ConversationDto>
  fetchContacts: () => Promise<ContactGroup[]>
  search: (q: string, conversationPublicId?: string) => Promise<SearchResultDto[]>
  subscribeToConversation: (publicId: string) => () => void
  emitTyping: (publicId: string) => void
  onIncomingMessage: (handler: (msg: MessageDto) => void) => () => void
  onMessageUpdate: (handler: (msg: MessageDto) => void) => () => void
  onReadReceipt: (handler: (data: { conversationPublicId: string; userId: number; upToMessageId: string; readAt: string }) => void) => () => void
  onTyping: (publicId: string, handler: (state: TypingState | null) => void) => () => void
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

const TYPING_TTL_MS = 3000

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const accessToken = (session as any)?.accessToken as string | undefined

  const socketRef = useRef<Socket | null>(null)
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const messageHandlers = useRef(new Set<(msg: MessageDto) => void>())
  const updateHandlers = useRef(new Set<(msg: MessageDto) => void>())
  const readHandlers = useRef(
    new Set<(data: { conversationPublicId: string; userId: number; upToMessageId: string; readAt: string }) => void>(),
  )
  const typingHandlers = useRef(new Map<string, Set<(state: TypingState | null) => void>>())
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const refreshConversations = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([listConversations(), getUnreadCount()])
      setConversations(list)
      setUnreadCount(unread)
    } catch (err) {
      console.error("[chat] refresh failed", err)
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setIsReady(false)
      return
    }

    let cancelled = false
    const socket = acquireSocket(accessToken)
    socketRef.current = socket

    const onConnect = async () => {
      if (cancelled) return
      setIsReady(true)
      await refreshConversations()
    }

    const onMessageNew = (msg: MessageDto) => {
      messageHandlers.current.forEach((h) => h(msg))
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.publicId === msg.conversationPublicId)
        if (idx === -1) {
          refreshConversations()
          return prev
        }
        const next = [...prev]
        const current = next[idx]
        next[idx] = {
          ...current,
          lastMessage: {
            publicId: msg.publicId,
            body: msg.body,
            senderUserId: msg.senderUserId,
            createdAt: msg.createdAt,
            deletedAt: msg.deletedAt,
          },
          lastMessageAt: msg.createdAt,
        }
        next.sort((a, b) => {
          const at = new Date(a.lastMessageAt || a.createdAt).getTime()
          const bt = new Date(b.lastMessageAt || b.createdAt).getTime()
          return bt - at
        })
        return next
      })
    }

    const onMessageUpdate = (msg: MessageDto) => {
      updateHandlers.current.forEach((h) => h(msg))
    }

    const onRead = (data: { conversationPublicId: string; userId: number; upToMessageId: string; readAt: string }) => {
      readHandlers.current.forEach((h) => h(data))
    }

    const onConversationUpsert = () => {
      refreshConversations()
    }

    const onUnreadChanged = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount)
    }

    const onTyping = (data: { conversationPublicId: string; userId: number; userName: string | null }) => {
      const handlers = typingHandlers.current.get(data.conversationPublicId)
      if (!handlers || handlers.size === 0) return
      const state: TypingState = {
        userId: data.userId,
        userName: data.userName,
        expiresAt: Date.now() + TYPING_TTL_MS,
      }
      handlers.forEach((h) => h(state))
      const prevTimer = typingTimers.current.get(data.conversationPublicId)
      if (prevTimer) clearTimeout(prevTimer)
      typingTimers.current.set(
        data.conversationPublicId,
        setTimeout(() => {
          handlers.forEach((h) => h(null))
          typingTimers.current.delete(data.conversationPublicId)
        }, TYPING_TTL_MS),
      )
    }

    socket.on("connect", onConnect)
    socket.on("chat:message:new", onMessageNew)
    socket.on("chat:message:update", onMessageUpdate)
    socket.on("chat:read", onRead)
    socket.on("chat:conversation:upsert", onConversationUpsert)
    socket.on("chat:unread:changed", onUnreadChanged)
    socket.on("chat:typing", onTyping)

    if (socket.connected) void onConnect()

    return () => {
      cancelled = true
      socket.off("connect", onConnect)
      socket.off("chat:message:new", onMessageNew)
      socket.off("chat:message:update", onMessageUpdate)
      socket.off("chat:read", onRead)
      socket.off("chat:conversation:upsert", onConversationUpsert)
      socket.off("chat:unread:changed", onUnreadChanged)
      socket.off("chat:typing", onTyping)
      releaseSocket(accessToken)
      socketRef.current = null
      setIsReady(false)
    }
  }, [accessToken, refreshConversations])

  const fetchMessages = useCallback(async (publicId: string, before?: string) => {
    return apiListMessages(publicId, { before })
  }, [])

  const sendMessage = useCallback(async (publicId: string, body: string, repliedToMessagePublicId?: string) => {
    return apiSendMessage(publicId, body, repliedToMessagePublicId)
  }, [])

  const pinMessage = useCallback(async (publicId: string, messageId: string) => {
    return apiPinMessage(publicId, messageId)
  }, [])

  const unpinMessage = useCallback(async (publicId: string, messageId: string) => {
    return apiUnpinMessage(publicId, messageId)
  }, [])

  const listPinnedMessages = useCallback(async (publicId: string) => {
    return apiListPinned(publicId)
  }, [])

  const addReaction = useCallback(async (publicId: string, messageId: string, emoji: string) => {
    return apiAddReaction(publicId, messageId, emoji)
  }, [])

  const removeReaction = useCallback(async (publicId: string, messageId: string, emoji: string) => {
    return apiRemoveReaction(publicId, messageId, emoji)
  }, [])

  const editMessage = useCallback(async (publicId: string, messageId: string, body: string) => {
    return apiEditMessage(publicId, messageId, body)
  }, [])

  const deleteMessage = useCallback(async (publicId: string, messageId: string) => {
    return apiDeleteMessage(publicId, messageId)
  }, [])

  const markRead = useCallback(async (publicId: string, upToMessagePublicId: string) => {
    await apiMarkRead(publicId, upToMessagePublicId)
  }, [])

  const startDirect = useCallback(async (targetType: ParticipantType, targetEntityPublicId: string) => {
    const conv = await createDirectConversation(targetType, targetEntityPublicId)
    await refreshConversations()
    return conv
  }, [refreshConversations])

  const startGroup = useCallback(async (payload: {
    employerPublicId: string
    clientPublicId: string
    workerPublicId: string
  }) => {
    const conv = await createGroupConversation(payload)
    await refreshConversations()
    return conv
  }, [refreshConversations])

  const fetchContacts = useCallback(async () => listContacts(), [])

  const search = useCallback(async (q: string, conversationPublicId?: string) => {
    return apiSearchMessages(q, conversationPublicId)
  }, [])

  const subscribeToConversation = useCallback((publicId: string) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.emit("chat:subscribe", { conversationPublicId: publicId })
    return () => {
      socket.emit("chat:unsubscribe", { conversationPublicId: publicId })
    }
  }, [])

  const emitTyping = useCallback((publicId: string) => {
    socketRef.current?.emit("chat:typing", { conversationPublicId: publicId })
  }, [])

  const onIncomingMessage = useCallback((handler: (msg: MessageDto) => void) => {
    messageHandlers.current.add(handler)
    return () => {
      messageHandlers.current.delete(handler)
    }
  }, [])

  const onMessageUpdate = useCallback((handler: (msg: MessageDto) => void) => {
    updateHandlers.current.add(handler)
    return () => {
      updateHandlers.current.delete(handler)
    }
  }, [])

  const onReadReceipt = useCallback(
    (handler: (data: { conversationPublicId: string; userId: number; upToMessageId: string; readAt: string }) => void) => {
      readHandlers.current.add(handler)
      return () => {
        readHandlers.current.delete(handler)
      }
    },
    [],
  )

  const onTyping = useCallback((publicId: string, handler: (state: TypingState | null) => void) => {
    let set = typingHandlers.current.get(publicId)
    if (!set) {
      set = new Set()
      typingHandlers.current.set(publicId, set)
    }
    set.add(handler)
    return () => {
      set?.delete(handler)
      if (set && set.size === 0) typingHandlers.current.delete(publicId)
    }
  }, [])

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      unreadCount,
      isReady,
      refreshConversations,
      fetchMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      listPinnedMessages,
      addReaction,
      removeReaction,
      markRead,
      startDirect,
      startGroup,
      fetchContacts,
      search,
      subscribeToConversation,
      emitTyping,
      onIncomingMessage,
      onMessageUpdate,
      onReadReceipt,
      onTyping,
    }),
    [
      conversations,
      unreadCount,
      isReady,
      refreshConversations,
      fetchMessages,
      sendMessage,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      listPinnedMessages,
      addReaction,
      removeReaction,
      markRead,
      startDirect,
      startGroup,
      fetchContacts,
      search,
      subscribeToConversation,
      emitTyping,
      onIncomingMessage,
      onMessageUpdate,
      onReadReceipt,
      onTyping,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}
