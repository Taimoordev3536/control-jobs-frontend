"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DataListTemplate from "@/components/ui/data-list-template"
import { Download, Trash2, DatabaseBackup, Save, Cloud, Link2, Unlink } from "lucide-react"
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
  error: string | null
  triggeredBy: string
  createdAt: string
}
interface Settings {
  enabled: boolean
  intervalHours: number
  provider: string
  keepLast: number
  localPath: string | null
}
interface Provider {
  key: string
  label: string
  connected: boolean
  configured: boolean
  accountEmail: string | null
}

function humanSize(n: number): string {
  if (!n) return "0 B"
  const u = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(n) / Math.log(1024))
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`
}

function BackupPageInner() {
  const { t } = useTranslation()
  const { session, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const params = useSearchParams()
  const api = process.env.NEXT_PUBLIC_API_BASE_URL
  const queryClient = useQueryClient()
  // settings stays local state (it is edited in a form below); providers +
  // the backup list are read-only React Query reads.
  const [settings, setSettings] = useState<Settings | null>(null)
  const [running, setRunning] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  const headers = useCallback(
    (json = false) => ({
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session?.accessToken],
  )

  const { data: backups = [], isLoading: loading } = useQuery<Backup[]>({
    queryKey: ["backup", "list"],
    queryFn: async () => {
      const b = await apiFetch<{ data: Backup[] }>("/backup")
      return b.data || []
    },
    enabled: isAuthenticated,
  })

  const { data: providers = [] } = useQuery<Provider[]>({
    queryKey: ["backup", "providers"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const p = await fetch(`${api}/backup/providers`, { headers: headers() }).then((r) => r.json())
      return p.data || []
    },
  })

  const { data: fetchedSettings } = useQuery<Settings | null>({
    queryKey: ["backup", "settings"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const s = await fetch(`${api}/backup/settings`, { headers: headers() }).then((r) => r.json())
      return s.data || null
    },
  })
  // Seed the editable settings form once loaded (no invalidation on edit ->
  // in-progress edits are never clobbered). Mutations call load() to refresh.
  useEffect(() => {
    if (fetchedSettings) setSettings(fetchedSettings)
  }, [fetchedSettings])

  const loadMeta = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["backup", "providers"] })
    queryClient.invalidateQueries({ queryKey: ["backup", "settings"] })
  }, [queryClient])

  // Reused by every mutation handler to refresh everything after an action.
  const load = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["backup", "list"] })
    loadMeta()
  }, [queryClient, loadMeta])

  useEffect(() => {
    const cloud = params.get("cloud")
    if (!cloud) return
    if (cloud === "connected") toast({ title: t("cloudConnected") || "Cloud account connected", variant: "success" })
    else if (cloud === "error") toast({ title: t("cloudConnectFailed") || "Could not connect the cloud account", variant: "destructive" })
    router.replace("/support/backup")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const connect = async (key: string) => {
    try {
      const res = await fetch(`${api}/backup/cloud/${key.toLowerCase()}/auth-url`, { headers: headers() })
      const body = await res.json()
      if (body?.data?.url) window.location.href = body.data.url
      else throw new Error(body?.message || "No auth URL")
    } catch (e: any) {
      toast({ title: t("somethingWentWrong") || "Something went wrong", description: e.message, variant: "destructive" })
    }
  }

  const disconnect = async (key: string) => {
    if (!window.confirm(t("confirmDisconnect") || "Disconnect this account?")) return
    try {
      const res = await fetch(`${api}/backup/cloud/${key.toLowerCase()}`, { method: "DELETE", headers: headers() })
      if (!res.ok) throw new Error("Failed")
      toast({ title: t("disconnected") || "Disconnected" })
      load()
    } catch {
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    }
  }

  const runBackup = async () => {
    setRunning(true)
    try {
      const res = await fetch(`${api}/backup/run`, {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ provider: settings?.provider }),
      })
      const body = await res.json()
      if (body?.data?.status === "SUCCESS") {
        toast({ title: t("backupCreated") || "Backup created", variant: "success" })
      } else {
        toast({ title: t("backupFailed") || "Backup failed", description: body?.data?.error, variant: "destructive" })
      }
      load()
    } catch (e: any) {
      toast({ title: t("somethingWentWrong") || "Something went wrong", description: e.message, variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    try {
      const res = await fetch(`${api}/backup/settings`, {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: t("savedSuccessfully") || "Saved successfully", variant: "success" })
    } catch {
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    } finally {
      setSavingSettings(false)
    }
  }

  const download = async (b: Backup) => {
    try {
      const res = await fetch(`${api}/backup/${b.publicId}/download`, { headers: headers() })
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = b.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    }
  }

  const remove = async (b: Backup) => {
    if (!window.confirm(t("confirmDeleteBackup") || "Delete this backup?")) return
    try {
      const res = await fetch(`${api}/backup/${b.publicId}`, { method: "DELETE", headers: headers() })
      if (!res.ok) throw new Error("Failed")
      toast({ title: t("deletedSuccessfully") || "Deleted successfully" })
      load()
    } catch {
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <AnimatedLoader size={32} />
      </div>
    )
  }

  const set = (k: keyof Settings, v: any) => setSettings((s) => (s ? { ...s, [k]: v } : s))

  const rows = backups.map((b) => ({
    id: b.publicId,
    date: formatLocalDateTime(b.createdAt),
    filename: b.filename,
    provider: b.provider,
    size: humanSize(Number(b.sizeBytes)),
    status: b.status,
    raw: b,
  }))

  const columns = [
    { key: "date", label: t("date") || "Date", sortable: true },
    { key: "filename", label: t("file") || "File", sortable: false },
    { key: "provider", label: t("storageDestination") || "Destination", sortable: true },
    { key: "size", label: t("size") || "Size", sortable: false, align: "right" as const },
    {
      key: "status",
      label: t("status") || "Status",
      sortable: true,
      align: "center" as const,
      render: (v: string) => (
        <span className={v === "SUCCESS" ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 font-medium"}>{v}</span>
      ),
    },
    {
      key: "actions",
      label: t("actions") || "Actions",
      sortable: false,
      align: "center" as const,
      render: (_: any, row: any) => (
        <div className="flex justify-center gap-1">
          {row.raw.status === "SUCCESS" && (
            <button onClick={() => download(row.raw)} title={t("download") || "Download"} className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded">
              <Download className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => remove(row.raw)} title={t("delete") || "Delete"} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-6">
      <div className="flex items-center gap-2">
        <DatabaseBackup className="h-6 w-6 text-[#662D91]" />
        <h1 className="text-2xl font-semibold text-foreground">{t("backup") || "Backup"}</h1>
      </div>

      {settings && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">{t("backupSettings") || "Backup settings"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t("storageDestination") || "Storage destination"}</Label>
              <Select value={settings.provider} onValueChange={(v) => set("provider", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.key} value={p.key} disabled={!p.connected}>
                      {p.label}{!p.connected ? ` (${t("notConnected") || "not connected"})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("intervalHours") || "Interval (hours)"}</Label>
              <Input type="number" min={1} value={settings.intervalHours}
                onChange={(e) => set("intervalHours", Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t("keepLast") || "Keep last (copies)"}</Label>
              <Input type="number" min={1} value={settings.keepLast}
                onChange={(e) => set("keepLast", Number(e.target.value) || 1)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={settings.enabled} onCheckedChange={(v) => set("enabled", v)} />
              <Label className="text-sm">{t("scheduledBackups") || "Scheduled backups"}</Label>
            </div>
          </div>
          {settings.provider === "LOCAL" && (
            <div className="space-y-2 max-w-xl">
              <Label className="text-sm">{t("localPath") || "Local path (optional)"}</Label>
              <Input value={settings.localPath || ""} placeholder="(default)" onChange={(e) => set("localPath", e.target.value)} />
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={saveSettings} disabled={savingSettings} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="h-4 w-4" />
              {savingSettings ? t("saving") || "Saving..." : t("save") || "Save"}
            </Button>
            <Button onClick={runBackup} disabled={running} variant="outline" className="gap-2 border-[#662D91] text-[#662D91] hover:bg-purple-50">
              {running ? <AnimatedLoader size={16} /> : <DatabaseBackup className="h-4 w-4" />}
              {t("backupNow") || "Backup now"}
            </Button>
          </div>
        </div>
      )}

      {/* Cloud connections */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-[#662D91]" />
          <h2 className="text-base font-semibold text-foreground">{t("cloudStorage") || "Cloud storage"}</h2>
        </div>
        <div className="space-y-3">
          {providers.filter((p) => p.key !== "LOCAL").map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="text-sm">
                <div className="font-medium text-foreground">{p.label}</div>
                <div className="text-xs text-muted-foreground">
                  {!p.configured
                    ? t("credentialsNotSet") || "Credentials not set up yet"
                    : p.connected
                      ? `${t("connected") || "Connected"}${p.accountEmail ? ` · ${p.accountEmail}` : ""}`
                      : t("notConnected") || "Not connected"}
                </div>
              </div>
              {p.configured && (
                p.connected ? (
                  <Button variant="outline" onClick={() => disconnect(p.key)} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                    <Unlink className="h-4 w-4" />
                    {t("disconnect") || "Disconnect"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => connect(p.key)} className="gap-2 border-[#662D91] text-[#662D91] hover:bg-purple-50">
                    <Link2 className="h-4 w-4" />
                    {t("connect") || "Connect"}
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <DataListTemplate
        title={t("backupHistory") || "Backup history"}
        data={rows}
        columns={columns}
        defaultSortColumn="date"
        defaultSortDirection="desc"
        emptyMessage={t("noBackupsYet") || "No backups yet"}
      />
    </div>
  )
}

export default function BackupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <AnimatedLoader size={32} />
        </div>
      }
    >
      <BackupPageInner />
    </Suspense>
  )
}
