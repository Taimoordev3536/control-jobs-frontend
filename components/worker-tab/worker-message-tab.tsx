"use client"

import { EntityChatPanel } from "@/components/chat/entity-chat-panel"

interface WorkerMessageTabProps {
  workerId: string
}

export function WorkerMessageTab({ workerId }: WorkerMessageTabProps) {
  return <EntityChatPanel targetType="WORKER" targetEntityPublicId={workerId} />
}
