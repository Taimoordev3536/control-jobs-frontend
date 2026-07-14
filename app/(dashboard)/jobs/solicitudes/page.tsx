"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"
import ConsultIcon from "@/icons/new/consultas.svg"

const statusMeta: Record<string, { key: string; fallback: string; cls: string; accent: string; dot: string }> = {
  pending: { key: "pending", fallback: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", accent: "border-l-amber-400", dot: "bg-amber-400" },
  accepted: { key: "accepted", fallback: "Aceptada", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", accent: "border-l-emerald-400", dot: "bg-emerald-500" },
  rejected: { key: "rejected", fallback: "Rechazada", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300", accent: "border-l-red-400", dot: "bg-red-500" },
}

export default function ClientSolicitudesPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [type, setType] = useState<"new_job" | "change">("new_job")
  const [jobPublicId, setJobPublicId] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [jobs, setJobs] = useState<any[]>([])
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState("")

  const load = useCallback(() => {
    if (!session?.accessToken) return
    const h = { Authorization: `Bearer ${session.accessToken}` }
    setLoading(true)
    Promise.all([
      fetch(`${base}/client-requests/mine`, { headers: h }).then((r) => r.json()),
      fetch(`${base}/jobs/client/all-jobs`, { headers: h }).then((r) => r.json()),
    ])
      .then(([reqs, js]) => {
        setList(Array.isArray(reqs?.data) ? reqs.data.filter((r: any) => r.type !== "absence") : [])
        setJobs(Array.isArray(js?.data) ? js.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken, base])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!session?.accessToken || !subject.trim()) {
      toast({ title: t("subjectRequired") || "Indica un asunto", variant: "destructive" })
      return
    }
    if (type === "change" && !jobPublicId) {
      toast({ title: t("selectJob") || "Selecciona un Job", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/client-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          jobPublicId: type === "change" ? jobPublicId : undefined,
          subject,
          description,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: t("requestSubmitted") || "Solicitud enviada", variant: "success" })
      setSubject(""); setDescription(""); setJobPublicId("")
      load()
    } catch {
      toast({ title: t("error") || "Error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const typeLabel = (v: string) =>
    v === "new_job" ? (t("newJob") || "Nuevo Job") : v === "change" ? (t("changeRequest") || "Cambio") : (t("absence") || "Ausencia")
  // Absence requests live in Calendario → Solicitudes; here only New Job / Change.

  const counts = {
    pending: list.filter((r) => r.status === "pending").length,
    accepted: list.filter((r) => r.status === "accepted").length,
    rejected: list.filter((r) => r.status === "rejected").length,
  }
  const filtered = filter ? list.filter((r) => r.status === filter) : list

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
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("requests") || "Solicitudes"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("clientRequestsSubtitle")}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
        <FilterTile label={t("pending") || "Pendientes"} value={counts.pending} dot={statusMeta.pending.dot} status="pending" />
        <FilterTile label={t("accepted") || "Aceptadas"} value={counts.accepted} dot={statusMeta.accepted.dot} status="accepted" />
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
              <Label className="text-xs font-medium text-muted-foreground">{t("type") || "Tipo"}</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_job">{t("newJob") || "Nuevo Job"}</SelectItem>
                  <SelectItem value="change">{t("changeRequest") || "Cambio en un Job"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "change" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t("job") || "Job"}</Label>
                <Select value={jobPublicId} onValueChange={setJobPublicId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={t("selectJob") || "Selecciona un Job"} /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.publicId} value={j.publicId}>{j.jobName || j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("subject") || "Asunto"}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" placeholder={type === "new_job" ? (t("newJobSubjectPlaceholder") || "p. ej. Limpieza sábados en Tienda Norte") : (t("changeSubjectPlaceholder") || "p. ej. Cambiar horario del turno")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("description") || "Descripción"} <span className="font-normal">({t("optional") || "Opcional"})</span></Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[100px] text-sm" />
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
            {loading ? (
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">{typeLabel(r.type)}</span>
                            {r.jobName && <span className="text-xs text-muted-foreground">· {r.jobName}</span>}
                            <span className="text-xs text-muted-foreground">· {formatLocalDate(r.createdAt)}</span>
                          </div>
                          <div className="text-sm font-semibold text-foreground mt-1 truncate">{r.subject || "—"}</div>
                          {(r.startDate || r.endDate) && (
                            <div className="text-xs text-muted-foreground mt-0.5">{r.startDate ? formatLocalDate(r.startDate) : "—"}{r.endDate ? ` → ${formatLocalDate(r.endDate)}` : ""}</div>
                          )}
                          {r.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>}
                          {r.reviewerNotes && <div className="text-xs text-muted-foreground mt-1"><b className="text-foreground">{t("response") || "Respuesta"}:</b> {r.reviewerNotes}</div>}
                        </div>
                        <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{t(s.key) || s.fallback}</span>
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
  )
}
