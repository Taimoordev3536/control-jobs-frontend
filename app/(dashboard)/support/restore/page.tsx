"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import DataListTemplate from "@/components/ui/data-list-template"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

interface Backup {
  publicId: string
  filename: string
  provider: string
  sizeBytes: number
  status: string
  createdAt: string
}

function humanSize(n: number): string {
  if (!n) return "0 B"
  const u = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`
}

export default function RestorePage() {
  const { t } = useTranslation()
  const { session, logout } = useAuth()
  const { toast } = useToast()
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${session?.accessToken}` }),
    [session?.accessToken],
  )

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${api}/backup`, { headers: headers() })
      const body = await res.json()
      setBackups((body.data || []).filter((b: Backup) => b.status === "SUCCESS"))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [api, headers, session?.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const restore = async (b: Backup) => {
    const msg =
      t("confirmRestore") ||
      "This will REPLACE all current data with this backup. This cannot be undone. Continue?"
    if (!window.confirm(msg)) return
    if (!window.confirm(t("confirmRestoreFinal") || "Are you absolutely sure?")) return
    setRestoringId(b.publicId)
    try {
      const res = await fetch(`${api}/backup/${b.publicId}/restore`, {
        method: "POST",
        headers: headers(),
      })
      const body = await res.json()
      if (!res.ok || body?.isSuccess === false) throw new Error(body?.message || "Restore failed")
      toast({
        title: t("restoreDone") || "Backup restored",
        description: `${body.data.rowsRestored} ${t("rowsRestored") || "rows restored"}. ${t("pleaseLoginAgain") || "Please log in again."}`,
        variant: "success",
      })
      setTimeout(() => logout(), 2500)
    } catch (e: any) {
      toast({ title: t("restoreFailed") || "Restore failed", description: e.message, variant: "destructive" })
      setRestoringId(null)
    }
  }

  const rows = backups.map((b) => ({
    id: b.publicId,
    date: formatLocalDateTime(b.createdAt),
    filename: b.filename,
    provider: b.provider,
    size: humanSize(Number(b.sizeBytes)),
    raw: b,
  }))

  const columns = [
    { key: "date", label: t("date") || "Date", sortable: true },
    { key: "filename", label: t("file") || "File", sortable: false },
    { key: "provider", label: t("storageDestination") || "Destination", sortable: true },
    { key: "size", label: t("size") || "Size", sortable: false, align: "right" as const },
    {
      key: "actions",
      label: t("actions") || "Actions",
      sortable: false,
      align: "center" as const,
      render: (_: any, row: any) => (
        <Button
          onClick={() => restore(row.raw)}
          disabled={!!restoringId}
          variant="outline"
          className="gap-2 border-[#662D91] text-[#662D91] hover:bg-purple-50"
        >
          {restoringId === row.raw.publicId ? <AnimatedLoader size={16} /> : <RotateCcw className="h-4 w-4" />}
          {t("restore") || "Restore"}
        </Button>
      ),
    },
  ]

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-6">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-6 w-6 text-[#662D91]" />
        <h1 className="text-2xl font-semibold text-foreground">{t("restore") || "Restore"}</h1>
      </div>

      <div className="flex gap-3 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t("restoreWarning") ||
            "Restoring replaces ALL current data with the selected backup. This cannot be undone — you will be logged out afterward."}
        </p>
      </div>

      <DataListTemplate
        title={t("availableBackups") || "Available backups"}
        data={rows}
        columns={columns}
        defaultSortColumn="date"
        defaultSortDirection="desc"
        emptyMessage={loading ? <AnimatedLoader size={32} /> : t("noBackupsYet") || "No backups yet"}
      />
    </div>
  )
}
