"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Plus, Loader2, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { DateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { formatLocalDate, madridTodayKey } from "@/lib/datetime"
import ClientCalendar from "@/components/dashboards/client-dashboard/client-calendar"
import { WorkerWorkCalendar } from "@/components/calendar/worker-work-calendar"
import ConsultIcon from "@/icons/new/consultas.svg"

const statusMeta: Record<string, { key: string; fallback: string; badge: string; accent: string; dot: string }> = {
  pending: { key: "pending", fallback: "Pendiente", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", accent: "border-l-amber-400", dot: "bg-amber-400" },
  approved: { key: "approved", fallback: "Aprobada", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", accent: "border-l-emerald-400", dot: "bg-emerald-500" },
  rejected: { key: "rejected", fallback: "Rechazada", badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300", accent: "border-l-red-400", dot: "bg-red-500" },
}

export default function CalendarPage() {
  const { getUserRole } = useAuth()
  return getUserRole() === "client" ? <ClientCalendar /> : <WorkerCalendarView />
}

function WorkerCalendarView() {
  const { t, language } = useTranslation()
  const router = useRouter()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const isAuthenticated = status === "authenticated"
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const todayStr = madridTodayKey()

  const [tab, setTab] = useState<"laboral" | "solicitudes">("laboral")

  // --- Solicitudes (absence requests) ---
  const [type, setType] = useState("vacation")
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState("")

  const typeLabel = (v: string) =>
    ({ vacation: t("absVacation") || "Vacaciones", permit: t("absPermit") || "Permiso", sick: t("absSick") || "Baja", other: t("absOther") || "Otro" } as Record<string, string>)[v] || v

  const { data: list = [], isLoading: loadingReq } = useQuery<any[]>({
    queryKey: ["absences", "mine"],
    queryFn: async () => {
      const j = await apiFetch<any>("/absences/mine")
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: isAuthenticated,
  })

  const counts = {
    pending: list.filter((r) => r.status === "pending").length,
    approved: list.filter((r) => r.status === "approved").length,
    rejected: list.filter((r) => r.status === "rejected").length,
  }
  const filtered = filter ? list.filter((r) => r.status === filter) : list

  const submit = async () => {
    if (!session?.accessToken) return
    if (endDate < startDate) {
      toast({ title: t("invalidDateRange") || "End date must be after start", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/absences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type, startDate, endDate, reason }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "failed") }
      toast({ title: t("requestSubmitted") || "Solicitud enviada", variant: "success" })
      setType("vacation"); setStartDate(todayStr); setEndDate(todayStr); setReason("")
      // A new absence changes both the request list and the calendar days.
      queryClient.invalidateQueries({ queryKey: ["absences"] })
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
    } catch (e: any) {
      toast({ title: e.message || t("error") || "Error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const FilterTile = ({ label, value, dot, status }: { label: string; value: number; dot: string; status: string }) => {
    const active = filter === status
    return (
      <button
        type="button"
        onClick={() => setFilter(active ? "" : status)}
        className={`text-left bg-card border rounded-xl shadow-sm px-4 py-3 transition-all hover:shadow-md ${active ? "border-[#662D91] ring-1 ring-[#662D91]" : "border-border"}`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</span>
        </div>
        <div className={`text-[11px] uppercase tracking-wide font-semibold mt-1.5 ${active ? "text-[#662D91]" : "text-muted-foreground"}`}>{label}</div>
      </button>
    )
  }

  return (
    <div className="w-full px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen space-y-4">
      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("back") || "Atrás"}
        </button>
        <h1 className="text-2xl font-semibold text-foreground">{t("calendar") || "Calendario"}</h1>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[{ k: "laboral", l: t("laboral") || "Laboral" }, { k: "solicitudes", l: t("requests") || "Solicitudes" }].map((x) => (
          <button key={x.k} onClick={() => setTab(x.k as any)} className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === x.k ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}>{x.l}</button>
        ))}
      </div>

      {tab === "laboral" && <WorkerWorkCalendar />}

      {tab === "solicitudes" && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
            <FilterTile label={t("pending") || "Pendientes"} value={counts.pending} dot={statusMeta.pending.dot} status="pending" />
            <FilterTile label={t("approved") || "Aprobadas"} value={counts.approved} dot={statusMeta.approved.dot} status="approved" />
            <FilterTile label={t("rejected") || "Rechazadas"} value={counts.rejected} dot={statusMeta.rejected.dot} status="rejected" />
          </div>

          <div className="grid gap-6 lg:grid-cols-5 items-start">
            <Card className="lg:col-span-2 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 bg-[#662D91] px-4 py-3 text-white">
                <Plus className="h-4 w-4" />
                <span className="text-sm font-semibold">{t("newRequest") || "Nueva solicitud"}</span>
              </div>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("type") || "Tipo"}</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">{t("absVacation") || "Vacaciones"}</SelectItem>
                      <SelectItem value="permit">{t("absPermit") || "Permiso"}</SelectItem>
                      <SelectItem value="sick">{t("absSick") || "Baja"}</SelectItem>
                      <SelectItem value="other">{t("absOther") || "Otro"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("from") || "Desde"}</label>
                    <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} allowPastDates className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{t("to") || "Hasta"}</label>
                    <DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} allowPastDates className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("reason") || "Motivo"} <span className="font-normal">({t("optional") || "Opcional"})</span></label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[100px] text-sm" />
                </div>
                <div className="flex justify-end pt-1">
                  <Button onClick={submit} disabled={submitting} className="bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    {t("sendRequest") || "Enviar solicitud"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 rounded-xl shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#662D91]/10 text-[#662D91]"><ConsultIcon className="h-4 w-4" /></span>
                  {t("myRequests") || "Mis solicitudes"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingReq ? (
                  <div className="flex justify-center py-12"><AnimatedLoader /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><ConsultIcon className="h-7 w-7" /></span>
                    <p className="text-sm text-muted-foreground">{filter ? (t("noResults") || "Sin resultados") : (t("noRequestsYet") || "No has enviado solicitudes.")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filtered.map((r) => {
                      const s = statusMeta[r.status] || statusMeta.pending
                      return (
                        <div key={r.id} className={`rounded-lg border border-border border-l-4 ${s.accent} bg-card p-3 shadow-sm transition-shadow hover:shadow-md`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground">{typeLabel(r.type)}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{formatLocalDate(r.startDate)} → {formatLocalDate(r.endDate)}</div>
                              {r.reason && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reason}</div>}
                              {r.reviewerNotes && <div className="text-xs text-muted-foreground mt-1"><b className="text-foreground">{t("response") || "Respuesta"}:</b> {r.reviewerNotes}</div>}
                            </div>
                            <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>{t(s.key) || s.fallback}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
