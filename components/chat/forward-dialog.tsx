"use client"

import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChat } from "@/components/providers/chat-provider"
import { useTranslation } from "@/hooks/use-translation"
import type { MessageDto } from "@/lib/api/chat"

interface ForwardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: MessageDto | null
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?"
}

export function ForwardDialog({ open, onOpenChange, message }: ForwardDialogProps) {
  const { t } = useTranslation()
  const { conversations, sendMessage } = useChat()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const list = conversations.filter((c) => c.publicId !== message?.conversationPublicId)
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((c) => c.displayName.toLowerCase().includes(q))
  }, [conversations, message?.conversationPublicId, query])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleForward() {
    if (!message?.body || selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all(
        Array.from(selected).map((cid) => sendMessage(cid, message.body!)),
      )
      onOpenChange(false)
      setSelected(new Set())
      setQuery("")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm">{t("forwardMessage") || "Reenviar mensaje"}</DialogTitle>
        </DialogHeader>
        <div className="border-b border-border px-3 py-2">
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
        <div className="chat-scrollbar max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              {t("noConversations")}
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.has(c.publicId)
              return (
                <button
                  key={c.publicId}
                  onClick={() => toggle(c.publicId)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent ${
                    isSelected ? "bg-sidebar-accent" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#662D91] text-xs font-semibold text-white">
                      {initials(c.displayName)}
                    </div>
                    {c.kind === "GROUP" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-[#662D91]">
                        <Users className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1 truncate">{c.displayName}</span>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#662D91] text-[10px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("cancel") || "Cancelar"}
          </Button>
          <Button size="sm" disabled={busy || selected.size === 0 || !message?.body} onClick={handleForward}>
            {t("forward") || "Reenviar"} {selected.size > 0 && `(${selected.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
