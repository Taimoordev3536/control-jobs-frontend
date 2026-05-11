"use client"

import { EntityChatPanel } from "@/components/chat/entity-chat-panel"

interface EmployerMessagesTabProps {
  employerId: string
}

export default function EmployerMessagesTab({ employerId }: EmployerMessagesTabProps) {
  return <EntityChatPanel targetType="EMPLOYER" targetEntityPublicId={employerId} />
}
