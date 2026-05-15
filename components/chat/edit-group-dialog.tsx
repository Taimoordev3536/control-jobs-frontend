"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import { Camera, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChat } from "@/components/providers/chat-provider"
import { useTranslation } from "@/hooks/use-translation"
import type { ConversationDto } from "@/lib/api/chat"
import { groupInitials } from "./chat-utils"

const MAX_GROUP_IMAGE_BYTES = 2 * 1024 * 1024
const ACCEPTED_GROUP_IMAGE_MIME = ["image/png", "image/jpeg", "image/jpg"]

interface EditGroupDialogProps {
  conversation: ConversationDto
  canEditName: boolean
  canEditImage: boolean
  onClose: () => void
}

export function EditGroupDialog({
  conversation,
  canEditName,
  canEditImage,
  onClose,
}: EditGroupDialogProps) {
  const { t } = useTranslation()
  const { renameGroup, uploadGroupImage, deleteGroupImage } = useChat()

  const [name, setName] = useState(conversation.displayName)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  const visiblePreview = previewUrl
    ?? (removeImage ? null : conversation.displayImageUrl)

  function handlePickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!ACCEPTED_GROUP_IMAGE_MIME.includes(file.type)) {
      setImageError(t("groupImage") + ": PNG/JPEG")
      return
    }
    if (file.size > MAX_GROUP_IMAGE_BYTES) {
      setImageError(t("groupImage") + ": 2MB")
      return
    }
    setImageError(null)
    setPendingFile(file)
    setRemoveImage(false)
  }

  function handleRemoveImage() {
    setPendingFile(null)
    setRemoveImage(true)
  }

  async function handleSave() {
    setBusy(true)
    try {
      if (canEditName && name.trim() !== conversation.displayName) {
        await renameGroup(conversation.publicId, name.trim() || null)
      }
      if (canEditImage && pendingFile) {
        await uploadGroupImage(conversation.publicId, pendingFile)
      } else if (canEditImage && removeImage && conversation.displayImageUrl) {
        await deleteGroupImage(conversation.publicId)
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("editGroup")}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => canEditImage && fileInputRef.current?.click()}
            disabled={!canEditImage}
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-lg font-semibold uppercase text-white disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={t("changeGroupImage")}
          >
            {visiblePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={visiblePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{groupInitials(name)}</span>
            )}
            {canEditImage && (
              <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border">
                <Camera className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
          {canEditImage && visiblePreview && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="flex items-center gap-1 text-xs text-destructive hover:underline"
            >
              <Trash2 className="h-3 w-3" />
              {t("removeGroupImage")}
            </button>
          )}
          {imageError && <span className="text-xs text-destructive">{imageError}</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handlePickImage}
          />
        </div>

        <div className="mb-4 space-y-1">
          <label className="block text-xs font-medium text-muted-foreground">
            {t("groupName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            disabled={!canEditName}
            placeholder={t("groupNamePlaceholder")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-[#662D91] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={busy || (!canEditName && !canEditImage)}>
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  )
}
