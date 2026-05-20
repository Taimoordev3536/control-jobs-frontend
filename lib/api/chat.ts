import { getSession } from "next-auth/react"

export type ParticipantType = "ADMIN" | "PARTNER" | "EMPLOYER" | "CLIENT" | "WORKER"
export type ConversationKind = "DIRECT" | "GROUP"

export interface ConversationParticipantDto {
  type: ParticipantType
  entityId: number
  name: string | null
  imageUrl: string | null
}

export interface ConversationDto {
  publicId: string
  kind: ConversationKind
  createdByUserId: number | null
  displayName: string
  displayImageUrl: string | null
  participants: ConversationParticipantDto[]
  lastMessage: {
    publicId: string
    body: string | null
    senderUserId: number
    createdAt: string
    deletedAt: string | null
    attachmentCount: number
    firstAttachmentKind: AttachmentKind | null
    firstAttachmentName: string | null
  } | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
}

export type AttachmentKind = "IMAGE" | "PDF"

export interface AttachmentDto {
  publicId: string
  kind: AttachmentKind
  url: string
  mimeType: string | null
  sizeBytes: number | null
  width: number | null
  height: number | null
  originalName: string | null
}

export interface RepliedToDto {
  publicId: string
  senderUserId: number
  senderUserName: string | null
  body: string | null
  deletedAt: string | null
  attachments: AttachmentDto[]
}

export interface ReactionDto {
  emoji: string
  count: number
  userIds: number[]
}

export interface MessageDto {
  publicId: string
  conversationPublicId: string
  senderUserId: number
  senderUserName: string | null
  senderEntityType: ParticipantType
  senderEntityId: number
  body: string | null
  editedAt: string | null
  deletedAt: string | null
  pinnedAt: string | null
  repliedTo: RepliedToDto | null
  reactions: ReactionDto[]
  attachments: AttachmentDto[]
  createdAt: string
  readBy: { userId: number; readAt: string }[]
}

export interface ContactGroup {
  type: ParticipantType
  items: {
    id: number
    name: string
    publicId?: string
    isSelf?: boolean
    imageUrl?: string | null
  }[]
}

export type PartnerTierName = "Gold" | "Silver" | "Bronze" | "Affiliate"

export interface MyScopeDto {
  participantType: ParticipantType
  participantEntityPublicId: string | null
  displayName: string
  partnerTier: PartnerTierName | null
  canCreateGroup: boolean
}

export interface SearchResultDto {
  messagePublicId: string
  conversationPublicId: string
  body: string
  createdAt: string
  senderUserId: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

async function authedFetch(path: string, init: RequestInit = {}) {
  const session = await getSession()
  const token = (session as any)?.accessToken
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function getMyScope(): Promise<MyScopeDto> {
  const json = await authedFetch(`/chat/me`)
  return json?.data
}

export async function listConversations(): Promise<ConversationDto[]> {
  const json = await authedFetch(`/chat/conversations`)
  return json?.data || []
}

export async function listMessages(
  conversationPublicId: string,
  options: { before?: string; limit?: number } = {},
): Promise<MessageDto[]> {
  const params = new URLSearchParams()
  if (options.before) params.set("before", options.before)
  if (options.limit) params.set("limit", String(options.limit))
  const qs = params.toString()
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages${qs ? `?${qs}` : ""}`,
  )
  return json?.data || []
}

export async function createDirectConversation(
  targetType: ParticipantType,
  targetEntityPublicId?: string,
): Promise<ConversationDto> {
  const payload: Record<string, unknown> = { targetType }
  if (targetEntityPublicId) payload.targetEntityPublicId = targetEntityPublicId
  const json = await authedFetch(`/chat/conversations/direct`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return json?.data
}

export async function createGroupConversation(payload: {
  employerPublicId: string
  adminPublicId?: string
  partnerPublicId?: string
  clientPublicId?: string
  workerPublicId?: string
  name?: string
}): Promise<ConversationDto> {
  const json = await authedFetch(`/chat/conversations/group`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return json?.data
}

export async function renameGroupConversation(
  conversationPublicId: string,
  name: string | null,
): Promise<ConversationDto> {
  const json = await authedFetch(`/chat/conversations/${conversationPublicId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })
  return json?.data
}

export async function uploadGroupImage(
  conversationPublicId: string,
  file: File,
): Promise<ConversationDto> {
  const session = await getSession()
  const token = (session as any)?.accessToken
  const form = new FormData()
  form.append("file", file, file.name)
  const res = await fetch(`${API_BASE}/chat/conversations/${conversationPublicId}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Upload failed: ${res.status}`)
  }
  const json = await res.json()
  return json?.data
}

export async function deleteGroupImage(conversationPublicId: string): Promise<ConversationDto> {
  const json = await authedFetch(`/chat/conversations/${conversationPublicId}/image`, {
    method: "DELETE",
  })
  return json?.data
}

export async function sendMessage(
  conversationPublicId: string,
  body: string,
  repliedToMessagePublicId?: string,
): Promise<MessageDto> {
  const json = await authedFetch(`/chat/conversations/${conversationPublicId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, repliedToMessagePublicId }),
  })
  return json?.data
}

export async function sendMessageWithAttachments(
  conversationPublicId: string,
  files: File[],
  body?: string,
  repliedToMessagePublicId?: string,
): Promise<MessageDto> {
  const session = await getSession()
  const token = (session as any)?.accessToken
  const form = new FormData()
  files.forEach((f) => form.append("files", f, f.name))
  if (body) form.append("body", body)
  if (repliedToMessagePublicId) form.append("repliedToMessagePublicId", repliedToMessagePublicId)

  const res = await fetch(`${API_BASE}/chat/conversations/${conversationPublicId}/messages/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `Upload failed: ${res.status}`)
  }
  const json = await res.json()
  return json?.data
}

export async function pinMessage(
  conversationPublicId: string,
  messagePublicId: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}/pin`,
    { method: "POST" },
  )
  return json?.data
}

export async function unpinMessage(
  conversationPublicId: string,
  messagePublicId: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}/pin`,
    { method: "DELETE" },
  )
  return json?.data
}

export async function addReaction(
  conversationPublicId: string,
  messagePublicId: string,
  emoji: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}/reactions`,
    { method: "POST", body: JSON.stringify({ emoji }) },
  )
  return json?.data
}

export async function removeReaction(
  conversationPublicId: string,
  messagePublicId: string,
  emoji: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}/reactions`,
    { method: "DELETE", body: JSON.stringify({ emoji }) },
  )
  return json?.data
}

export async function listPinnedMessages(conversationPublicId: string): Promise<MessageDto[]> {
  const json = await authedFetch(`/chat/conversations/${conversationPublicId}/pinned`)
  return json?.data || []
}

export async function editMessage(
  conversationPublicId: string,
  messagePublicId: string,
  body: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}`,
    { method: "PATCH", body: JSON.stringify({ body }) },
  )
  return json?.data
}

export async function deleteMessage(
  conversationPublicId: string,
  messagePublicId: string,
): Promise<MessageDto> {
  const json = await authedFetch(
    `/chat/conversations/${conversationPublicId}/messages/${messagePublicId}`,
    { method: "DELETE" },
  )
  return json?.data
}

export async function markRead(
  conversationPublicId: string,
  upToMessagePublicId: string,
): Promise<void> {
  await authedFetch(`/chat/conversations/${conversationPublicId}/read`, {
    method: "POST",
    body: JSON.stringify({ upToMessagePublicId }),
  })
}

export async function getUnreadCount(): Promise<number> {
  const json = await authedFetch(`/chat/unread-count`)
  return Number(json?.data || 0)
}

export async function listContacts(): Promise<ContactGroup[]> {
  const json = await authedFetch(`/chat/contacts`)
  return json?.data || []
}

export async function searchMessages(
  q: string,
  conversationPublicId?: string,
): Promise<SearchResultDto[]> {
  const params = new URLSearchParams({ q })
  if (conversationPublicId) params.set("conversationPublicId", conversationPublicId)
  const json = await authedFetch(`/chat/search?${params.toString()}`)
  return json?.data || []
}
