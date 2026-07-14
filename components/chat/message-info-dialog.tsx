"use client"

import { Check, CheckCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MessageDto } from "@/lib/api/chat"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDateTime } from "@/lib/datetime"

interface MessageInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: MessageDto | null
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—"
  return formatLocalDateTime(value)
}

export function MessageInfoDialog({ open, onOpenChange, message }: MessageInfoDialogProps) {
  const { t } = useTranslation()
  if (!message) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("messageInfo") || "Message info"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted/40 p-3">
            <div className="break-words text-sm text-foreground">
              {message.deletedAt ? <span className="italic text-muted-foreground">{t("messageDeleted")}</span> : message.body}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Check className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Enviado:</span>
            <span>{formatDateTime(message.createdAt)}</span>
          </div>
          {message.editedAt && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-muted-foreground">Editado:</span>
              <span>{formatDateTime(message.editedAt)}</span>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs">
              <CheckCheck className="h-4 w-4 text-[#662D91]" />
              <span className="font-medium text-muted-foreground">Leído por</span>
            </div>
            {message.readBy.length === 0 ? (
              <div className="px-2 text-xs text-muted-foreground">—</div>
            ) : (
              <ul className="space-y-1 text-xs">
                {message.readBy.map((r) => (
                  <li key={r.userId} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/50">
                    <span>{`Usuario ${r.userId}`}</span>
                    <span className="text-muted-foreground">{formatDateTime(r.readAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
