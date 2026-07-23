"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import profilePlaceholder from "@/icons/Header/profilePlaceholder.png"

interface InlineImageUploaderProps {
  initialUrl?: string | null
  uploadPath: string
  urlField?: string
  accessToken?: string
  label?: string
  onChange?: (url: string | null) => void
}

export function InlineImageUploader({
  initialUrl = null,
  uploadPath,
  urlField = "logoUrl",
  accessToken,
  label,
  onChange,
}: InlineImageUploaderProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const translateBackendError = useBackendError()
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // initialUrl arrives asynchronously (the parent fetches /worker/me after
  // mount), so seed from it whenever it changes — useState only reads it once,
  // which left the avatar stuck on the placeholder even when a photo existed.
  useEffect(() => {
    setUrl(initialUrl)
  }, [initialUrl])

  const pick = () => inputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({ title: t("logoMustBePngOrJpeg") || "Image must be PNG or JPEG", variant: "destructive" })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("logoTooLarge") || "Image must be 2 MB or smaller", variant: "destructive" })
      return
    }
    if (!accessToken) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${uploadPath}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const result = await res.json()
      const newUrl = result?.data?.[urlField] ?? null
      setUrl(newUrl)
      onChange?.(newUrl)
      toast({ title: t("updated") || "Updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!accessToken || !url) return
    setBusy(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${uploadPath}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      setUrl(null)
      onChange?.(null)
      toast({ title: t("removed") || "Removed", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      {label && <span className="text-xs font-medium text-foreground">{label}</span>}
      <div className="relative w-16 h-16">
        <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center overflow-hidden">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url || profilePlaceholder.src}
              alt={label || ""}
              onClick={pick}
              className="w-full h-full object-contain cursor-pointer"
            />
          )}
        </div>
        {!busy && (
          <>
            {url && (
              <button
                type="button"
                onClick={remove}
                title={t("remove") || "Remove"}
                className="absolute -top-1 -right-1 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={pick}
              title={url ? t("changeLogo") || "Change" : t("add") || "Add"}
              className="absolute -bottom-1 -right-1 z-10 bg-[#662D91] hover:bg-[#532073] text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
            >
              {url ? <Pencil className="w-2.5 h-2.5" /> : <Plus className="w-3 h-3" strokeWidth={3} />}
            </button>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} />
    </div>
  )
}
