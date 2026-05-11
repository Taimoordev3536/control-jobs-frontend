"use client"

import { EntityChatPanel } from "@/components/chat/entity-chat-panel"

interface ClientMessagesTabProps {
  clientId: string
}

export function ClientMessagesTab({ clientId }: ClientMessagesTabProps) {
  return <EntityChatPanel targetType="CLIENT" targetEntityPublicId={clientId} />
}
