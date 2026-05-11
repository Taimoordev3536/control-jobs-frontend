"use client"

import { EntityChatPanel } from "@/components/chat/entity-chat-panel"

interface PartnerMessagesTabProps {
  partnerId: string
}

export default function PartnerMessagesTab({ partnerId }: PartnerMessagesTabProps) {
  return <EntityChatPanel targetType="PARTNER" targetEntityPublicId={partnerId} />
}
