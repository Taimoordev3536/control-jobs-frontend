"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, FileText } from "lucide-react"
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

const statusMeta: Record<string, { key: string; fallback: string; cls: string }> = {
  pending: { key: "pending", fallback: "Pendiente", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  accepted: { key: "accepted", fallback: "Aceptada", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  rejected: { key: "rejected", fallback: "Rechazada", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
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
        body: JSON.stringify({ type, jobPublicId: type === "change" ? jobPublicId : undefined, subject, description }),
      })
      if (!res.ok) throw new Error()
      toast({ title: t("requestSubmitted") || "Solicitud enviada" })
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

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("requests") || "Solicitudes"}</h1>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#662D91]" />
              {t("newRequest") || "Nueva solicitud"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t("type") || "Tipo"}</Label>
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
                  <Label className="text-xs text-muted-foreground">{t("job") || "Job"}</Label>
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("subject") || "Asunto"}</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" placeholder={type === "new_job" ? (t("newJobSubjectPlaceholder") || "p. ej. Limpieza sábados en Tienda Norte") : (t("changeSubjectPlaceholder") || "p. ej. Cambiar horario del turno")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("description") || "Descripción"}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px] text-sm" />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting} className="bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">
                {t("sendRequest") || "Enviar solicitud"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("myRequests") || "Mis solicitudes"}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><AnimatedLoader /></div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("noRequestsYet") || "No has enviado solicitudes."}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((r) => {
                  const s = statusMeta[r.status] || statusMeta.pending
                  return (
                    <div key={r.id} className="rounded-lg border border-border bg-background p-3 flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#662D91] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">{typeLabel(r.type)}</span>
                          {r.jobName && <span className="text-xs text-muted-foreground">· {r.jobName}</span>}
                          <span className="text-xs text-muted-foreground">· {formatLocalDate(r.createdAt)}</span>
                        </div>
                        <div className="text-sm font-medium mt-0.5 truncate">{r.subject || "—"}</div>
                        {r.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>}
                        {r.reviewerNotes && <div className="text-xs text-muted-foreground mt-1"><b>{t("response") || "Respuesta"}:</b> {r.reviewerNotes}</div>}
                      </div>
                      <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{t(s.key) || s.fallback}</span>
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
