import type { ConversationDto, MessageDto, ParticipantType } from "@/lib/api/chat"
import { madridYmd, madridTodayKey, formatLocalTime, DEFAULT_TIMEZONE } from "@/lib/datetime"

export function formatDayLabel(date: Date, today: string, yesterday: string): string {
  const key = madridYmd(date)
  const todayKey = madridTodayKey()
  if (key === todayKey) return today
  const y = new Date(`${todayKey}T00:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  if (key === madridYmd(y)) return yesterday
  return date.toLocaleDateString("es-ES", { timeZone: DEFAULT_TIMEZONE })
}

export function formatTime(date: Date): string {
  return formatLocalTime(date)
}

export function shouldShowSenderLabel(
  conversation: ConversationDto | null,
  message: MessageDto,
): boolean {
  if (!conversation) return false
  if (conversation.kind === "GROUP") return true
  const senderEntity = conversation.participants.find(
    (p) => p.type === message.senderEntityType && p.entityId === message.senderEntityId,
  )
  if (!senderEntity) return false
  return false
}

export function groupByDay(
  messages: MessageDto[],
  todayLabel: string,
  yesterdayLabel: string,
): Map<string, MessageDto[]> {
  const groups = new Map<string, MessageDto[]>()
  for (const m of messages) {
    const d = new Date(m.createdAt)
    const key = formatDayLabel(d, todayLabel, yesterdayLabel)
    const arr = groups.get(key) || []
    arr.push(m)
    groups.set(key, arr)
  }
  return groups
}

export function isAllReadByOthers(
  message: MessageDto,
  conversation: ConversationDto | null,
  myUserId: number,
  otherUserIds: number[],
): boolean {
  if (!conversation) return false
  if (otherUserIds.length === 0) return false
  if (message.senderUserId !== myUserId) return false
  const readerIds = new Set(message.readBy.map((r) => r.userId))
  return otherUserIds.every((uid) => readerIds.has(uid))
}

export function participantLabel(type: ParticipantType): string {
  switch (type) {
    case "ADMIN":
      return "Admin"
    case "PARTNER":
      return "Partner"
    case "EMPLOYER":
      return "Empleador"
    case "CLIENT":
      return "Cliente"
    case "WORKER":
      return "Trabajador"
  }
}

export function groupInitials(name: string | null | undefined): string {
  const tokens = (name || "").trim().toLowerCase().match(/[a-z]+|[0-9]+/g) || []
  if (tokens.length >= 2) return tokens[0][0] + tokens[1][0]
  if (tokens.length === 1) return tokens[0].slice(0, 2)
  return "?"
}
