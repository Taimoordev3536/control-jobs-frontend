"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"

export function AliasField() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()
  const [alias, setAlias] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/me/profile`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setAlias(json?.data?.alias ?? "")
        }
      } catch {
        /* swallow */
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/me/profile`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alias }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const json = await res.json()
      const saved = json?.data?.alias ?? ""
      setAlias(saved)
      window.dispatchEvent(new CustomEvent("user-alias-changed", { detail: { alias: saved } }))
      toast({ title: t("updated") || "Updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <h2 className="text-base font-semibold">{t("alias") || "Alias"}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t("aliasHint")}</p>
      </div>
      <div className="p-4 flex items-end gap-3 flex-wrap">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
          <Label htmlFor="alias" className="text-xs font-medium text-foreground">
            {t("alias") || "Alias"}
          </Label>
          <Input
            id="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={255}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {isSaving ? t("saving") || "Saving..." : t("keep")}
        </Button>
      </div>
    </div>
  )
}
