"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, FileText, Plus, Send } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface AttachmentCaptionProps {
  files: File[]
  mode: "image" | "pdf"
  onBack: () => void
  onSend: (caption: string) => Promise<void>
  onAddMore?: () => void
}

function humanSize(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export function AttachmentCaption({ files, mode, onBack, onSend, onAddMore }: AttachmentCaptionProps) {
  const { t } = useTranslation()
  const [caption, setCaption] = useState("")
  const [sending, setSending] = useState(false)
  const [active, setActive] = useState(0)

  const previews = useMemo(() => {
    if (mode !== "image") return [] as string[]
    return files.map((f) => URL.createObjectURL(f))
  }, [files, mode])

  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p))
  }, [previews])

  const handleSend = async () => {
    if (sending) return
    setSending(true)
    try {
      await onSend(caption.trim())
    } finally {
      setSending(false)
    }
  }

  const activeFile = files[active]

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background text-foreground">
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <button
          onClick={onBack}
          className="flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-sm hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </button>
        <span className="text-sm font-medium">
          {mode === "image"
            ? `${files.length} foto${files.length > 1 ? "s" : ""}`
            : `${files.length} archivo${files.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        {mode === "image" ? (
          <img
            src={previews[active]}
            alt=""
            className="max-h-full max-w-full select-none rounded-md object-contain"
          />
        ) : activeFile ? (
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 p-6">
            <FileText className="h-16 w-16 text-[#662D91]" />
            <div className="text-center">
              <div className="text-sm font-medium">{activeFile.name}</div>
              <div className="text-xs text-muted-foreground">PDF · {humanSize(activeFile.size)}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-end gap-2 border-t border-border bg-card px-3 py-2">
        <textarea
          rows={1}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = "auto"
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`
          }}
          placeholder={t("typeMessage")}
          className="chat-scrollbar max-h-40 min-h-9 flex-1 resize-none overflow-y-auto rounded-md border border-border bg-background px-3 py-2 text-sm chat-caret focus:border-[#662D91] focus:outline-none"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-2">
        <div className="chat-scrollbar flex flex-1 items-center gap-2 overflow-x-auto">
          {files.map((f, i) => {
            const isActive = i === active
            return (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border-2 bg-muted ${
                  isActive ? "border-[#662D91]" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {mode === "image" ? (
                  <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-7 w-7 text-muted-foreground" />
                )}
              </button>
            )
          })}
          {onAddMore && (
            <button
              onClick={onAddMore}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              aria-label="add more"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#662D91] text-white shadow-lg transition-colors hover:bg-[#7a3aaa] disabled:opacity-60"
          aria-label="Send"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
