"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { InlineImageUploader } from "@/components/inline-image-uploader"

export function AdminProfileTab() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [name, setName] = useState(session?.user?.name || "")
  const [email, setEmail] = useState(session?.user?.email || "")
  const [isSaving, setIsSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoLoaded, setLogoLoaded] = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/admin/me`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) {
            setLogoUrl(json?.data?.logoUrl ?? null)
            if (json?.data?.name != null) setName(json.data.name)
            if (json?.data?.email != null) setEmail(json.data.email)
          }
        }
      } finally {
        if (!cancelled) setLogoLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.accessToken])

  const handleSave = async () => {
    if (!session?.accessToken) return
    setIsSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/admin/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      toast({ title: t("updated") || "Updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setName(session?.user?.name || "")
    setEmail(session?.user?.email || "")
  }

  return (
    <div className="space-y-3 pt-1 px-2">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(40% - 0.375rem)" }}>
          <Label htmlFor="adminName" className="text-xs font-medium text-foreground">
            {t("name")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="adminName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(40% - 0.375rem)" }}>
          <Label htmlFor="adminEmail" className="text-xs font-medium text-foreground">
            {t("email")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="adminEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        {logoLoaded && (
          <InlineImageUploader
            initialUrl={logoUrl}
            uploadPath="/users/admin/me/logo"
            accessToken={session?.accessToken}
            label={t("profile")}
          />
        )}
      </div>

      <div className="border-t-2 border-border mt-4" />
      <div className="flex items-center gap-3 px-2 py-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {isSaving ? t("saving") || "Saving..." : t("keep")}
        </Button>
        <Button
          type="button"
          onClick={handleCancel}
          className="h-9 bg-neutral-500 hover:bg-neutral-600 text-white px-5 text-xs"
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  )
}
