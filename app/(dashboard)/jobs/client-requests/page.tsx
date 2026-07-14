"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Check, X, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"

const statusMeta: Record<string, { key: string; fallback: string; cls: string }> = {
  pending: { key: "pending", fallback: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  accepted: { key: "accepted", fallback: "Aceptada", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  rejected: { key: "rejected", fallback: "Rechazada", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
}

const FILTERS = ["pending", "accepted", "rejected", "all"] as const
type Filter = (typeof FILTERS)[number]

export default function EmployerClientRequestsPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("pending")

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setLoading(true)
    fetch(`${base}/client-requests`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => setList(Array.isArray(j?.data) ? j.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken, base])

  useEffect(() => { load() }, [load])

  const counts: Record<Filter, number> = {
    pending: list.filter((r) => r.status === "pending").length,
    accepted: list.filter((r) => r.status === "accepted").length,
    rejected: list.filter((r) => r.status === "rejected").length,
    all: list.length,
  }
  const filtered = filter === "all" ? list : list.filter((r) => r.status === filter)

  const typeLabel = (v: string) =>
    v === "new_job" ? (t("newJob") || "Nuevo Job") : v === "change" ? (t("changeRequest") || "Cambio") : (t("absence") || "Ausencia")

  const review = async (id: string, status: "accepted" | "rejected", notes: string) => {
    if (!session?.accessToken) return
    const res = await fetch(`${base}/client-requests/${id}/review`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewerNotes: notes || undefined }),
    })
    if (!res.ok) { toast({ title: t("error") || "Error", variant: "destructive" }); return }
    toast({ title: status === "accepted" ? (t("requestAccepted") || "Solicitud aceptada") : (t("requestRejected") || "Solicitud rechazada"), variant: "success" })
    load()
  }

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("clientRequests") || "Solicitudes de clientes"}</h1>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${filter === f ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}
          >
            {f === "all" ? (t("all") || "Todas") : (t(statusMeta[f].key) || statusMeta[f].fallback)}
            {counts[f] > 0 && <span className="ml-1.5 text-xs">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><AnimatedLoader /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noClientRequests") || "No hay solicitudes."}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((r) => (
            <RequestCard key={r.id} r={r} typeLabel={typeLabel} onReview={review} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({
  r,
  typeLabel,
  onReview,
}: {
  r: any
  typeLabel: (v: string) => string
  onReview: (id: string, status: "accepted" | "rejected", notes: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState<null | "accepted" | "rejected">(null)
  const s = statusMeta[r.status] || statusMeta.pending
  const isPending = r.status === "pending"

  const act = async (status: "accepted" | "rejected") => {
    setBusy(status)
    try { await onReview(r.id, status, notes) } finally { setBusy(null) }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{r.subject || "—"}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">{typeLabel(r.type)}</span>
              <span className="text-xs text-muted-foreground">{r.clientName || "—"}</span>
              <span className="text-xs text-muted-foreground">· {formatLocalDate(r.createdAt)}</span>
            </div>
          </div>
          <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{t(s.key) || s.fallback}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        {r.jobName && <div className="text-xs text-muted-foreground"><b className="text-foreground">{t("job") || "Job"}:</b> {r.jobName}</div>}
        {(r.startDate || r.endDate) && (
          <div className="text-xs text-muted-foreground"><b className="text-foreground">{t("dates") || "Fechas"}:</b> {r.startDate ? formatLocalDate(r.startDate) : "—"}{r.endDate ? ` → ${formatLocalDate(r.endDate)}` : ""}</div>
        )}
        {r.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.description}</p>}

        {isPending ? (
          <div className="mt-auto space-y-2 pt-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("reviewNotesPlaceholder") || "Nota para el cliente (opcional)"} className="min-h-[60px] text-sm" />
            <div className="flex gap-2">
              <Button size="sm" disabled={!!busy} onClick={() => act("accepted")} className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="h-3.5 w-3.5 mr-1" />{t("accept") || "Aceptar"}
              </Button>
              <Button size="sm" disabled={!!busy} onClick={() => act("rejected")} variant="outline" className="flex-1 h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
                <X className="h-3.5 w-3.5 mr-1" />{t("reject") || "Rechazar"}
              </Button>
            </div>
          </div>
        ) : (
          r.reviewerNotes && <div className="text-xs text-muted-foreground mt-auto pt-2"><b className="text-foreground">{t("response") || "Respuesta"}:</b> {r.reviewerNotes}</div>
        )}
      </CardContent>
    </Card>
  )
}
