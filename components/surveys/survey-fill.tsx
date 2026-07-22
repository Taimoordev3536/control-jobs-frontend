"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, CheckCircle2, ShieldCheck, Eye } from "lucide-react"
import SurvayIcon from "@/icons/Menu/surveys.svg"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"
import { apiFetch } from "@/lib/api"

export function SurveyFill() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const queryClient = useQueryClient()
  const [active, setActive] = useState<any | null>(null)
  const [viewing, setViewing] = useState<any | null>(null)
  const [filter, setFilter] = useState("")

  // apiFetch, not raw fetch: it sends the impersonation token when one is
  // active. Using session.accessToken sent the EMPLOYER's own token while
  // impersonating, so the API resolved the employer — who is neither a worker
  // nor a client — and answered 403 for every survey request.
  const { data: list = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["survey-forms", "mine"],
    queryFn: async () => {
      const j = await apiFetch<any>("/survey-forms/mine")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: status === "authenticated",
  })
  const load = () => queryClient.invalidateQueries({ queryKey: ["survey-forms", "mine"] })

  const counts = { pending: list.filter((s) => !s.filled).length, completed: list.filter((s) => s.filled).length }
  const filtered = filter === "pending" ? list.filter((s) => !s.filled) : filter === "completed" ? list.filter((s) => s.filled) : list

  const FilterTile = ({ label, value, dot, status }: { label: string; value: number; dot: string; status: string }) => {
    const activeF = filter === status
    return (
      <button type="button" onClick={() => setFilter(activeF ? "" : status)}
        className={`text-left bg-card border rounded-xl shadow-sm px-4 py-3 transition-all hover:shadow-md ${activeF ? "border-[#662D91] ring-1 ring-[#662D91]" : "border-border"}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</span>
        </div>
        <div className={`text-[11px] uppercase tracking-wide font-semibold mt-1.5 ${activeF ? "text-[#662D91]" : "text-muted-foreground"}`}>{label}</div>
      </button>
    )
  }

  return (
    <div className="w-full px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("surveys") || "Encuestas"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t("surveysFillSubtitle") || "Responde las encuestas pendientes"}</p>
      </div>

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <FilterTile label={t("pending") || "Pendientes"} value={counts.pending} dot="bg-[#662D91]" status="pending" />
          <FilterTile label={t("completed") || "Completadas"} value={counts.completed} dot="bg-emerald-500" status="completed" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><AnimatedLoader /></div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><SurvayIcon className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">{t("noSurveysForYou") || "No tienes encuestas pendientes."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><SurvayIcon className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">{t("noResults") || "Sin resultados"}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              <div className={`h-1 ${s.filled ? "bg-emerald-500" : "bg-[#662D91]"}`} />
              <div className="p-4 space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#662D91]/10 text-[#662D91] shrink-0"><SurvayIcon className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{s.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.questions?.length || 0} {t("questions") || "preguntas"}</span>
                      {s.anonymous && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-[#662D91] dark:bg-purple-950/50"><ShieldCheck className="h-3 w-3" />{t("anonymous") || "Anónima"}</span>}
                      {s.filled && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"><CheckCircle2 className="h-3 w-3" />{t("completed") || "Completada"}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2"><b className="text-foreground">{t("description") || "Descripción"}:</b> {s.description || "—"}</div>
              </div>
              <div className="p-3 pt-0">
                {s.filled ? (
                  <Button onClick={() => setViewing(s)} variant="outline" className="w-full h-9 text-sm"><Eye className="h-4 w-4 mr-1.5" />{t("viewMyAnswers") || "Ver mis respuestas"}</Button>
                ) : (
                  <Button onClick={() => setActive(s)} className="w-full bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">{t("answer") || "Responder"}</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && <FillDialog survey={active} onClose={() => setActive(null)} onDone={() => { setActive(null); load() }} />}
      {viewing && <MyResponseDialog survey={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function MyResponseDialog({ survey, onClose }: { survey: any; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const { data = null, isLoading: loading } = useQuery<any | null>({
    queryKey: ["survey-forms", survey.id, "my-response"],
    queryFn: async () => {
      const j = await apiFetch<any>(`/survey-forms/${survey.id}/my-response`)
      return j?.data || null
    },
    enabled: status === "authenticated" && !!survey.id,
  })

  const render = (v: any) => (Array.isArray(v) ? v.join(", ") : v === true ? (t("yes") || "Sí") : v === false ? (t("no") || "No") : String(v ?? "—"))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">{survey.title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><AnimatedLoader /></div>
          ) : data?.anonymous ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-[#662D91] dark:bg-purple-950/50"><ShieldCheck className="h-6 w-6" /></span>
              <p className="text-sm text-muted-foreground max-w-xs">{t("anonymousNoData") || "Encuesta anónima — tus respuestas no se guardan con tu identidad."}</p>
            </div>
          ) : (data?.answers || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">—</p>
          ) : (
            <div className="space-y-3">
              {data.submittedAt && <div className="text-xs text-muted-foreground">{formatLocalDate(data.submittedAt)}</div>}
              {data.answers.map((a: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-3 bg-muted/20">
                  <div className="text-xs font-semibold text-foreground">{i + 1}. {a.questionText}</div>
                  <div className="text-sm text-muted-foreground mt-1">{render(a.value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button onClick={onClose} className="bg-[#662D91] hover:bg-[#532073] text-white">{t("close") || "Cerrar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FillDialog({ survey, onClose, onDone }: { survey: any; onClose: () => void; onDone: () => void }) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [consent, setConsent] = useState(false)
  const [saving, setSaving] = useState(false)

  const setA = (qid: string, v: any) => setAnswers((a) => ({ ...a, [qid]: v }))

  const submit = async () => {
    if (!session?.accessToken) return
    if (!consent) { toast({ title: t("consentRequired") || "Debes aceptar el aviso de privacidad", variant: "destructive" }); return }
    const missing = (survey.questions || []).find((q: any) => q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)))
    if (missing) { toast({ title: t("answerAllRequired") || "Responde las preguntas obligatorias", variant: "destructive" }); return }
    setSaving(true)
    try {
      await apiFetch(`/survey-forms/${survey.id}/submit`, {
        method: "POST",
        body: { answers: (survey.questions || []).map((q: any) => ({ questionId: q.id, value: answers[q.id] })) },
      })
      toast({ title: t("surveySubmitted") || "Encuesta enviada. ¡Gracias!", variant: "success" })
      onDone()
    } catch (e: any) {
      // Surface the reason rather than a bare "Error".
      toast({ title: e?.message || t("error") || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">{survey.title}</DialogTitle>
          {survey.description && <p className="text-sm text-muted-foreground text-center">{survey.description}</p>}
        </DialogHeader>

        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
          {(survey.questions || []).map((q: any, i: number) => (
            <div key={q.id} className="space-y-2">
              <div className="text-sm font-medium">{i + 1}. {q.text} {q.required && <span className="text-red-500">*</span>}</div>

              {q.type === "rating" && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-11 gap-1">
                    {Array.from({ length: 11 }, (_, n) => (
                      <button key={n} type="button" onClick={() => setA(q.id, n)} className={`aspect-square rounded-lg text-sm font-bold border transition-colors ${answers[q.id] === n ? "bg-[#662D91] text-white border-[#662D91]" : "bg-muted/50 text-foreground border-border hover:border-[#662D91]"}`}>{n}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                    <span>{t("notSatisfied") || "Nada satisfecho"}</span>
                    <span>{t("verySatisfied") || "Muy satisfecho"}</span>
                  </div>
                </div>
              )}

              {q.type === "yes_no" && (
                <div className="flex gap-2">
                  {[{ v: true, l: t("yes") || "Sí" }, { v: false, l: t("no") || "No" }].map((o) => (
                    <button key={String(o.v)} type="button" onClick={() => setA(q.id, o.v)} className={`px-4 h-9 rounded-md border text-sm ${answers[q.id] === o.v ? "bg-[#662D91] text-white border-[#662D91]" : "border-border hover:border-[#662D91]"}`}>{o.l}</button>
                  ))}
                </div>
              )}

              {q.type === "single_choice" && (
                <div className="flex flex-col gap-1.5">
                  {(q.options || []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setA(q.id, opt)} className="accent-[#662D91]" />{opt}
                    </label>
                  ))}
                </div>
              )}

              {q.type === "multi_choice" && (
                <div className="flex flex-col gap-1.5">
                  {(q.options || []).map((opt: string) => {
                    const arr: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : []
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={arr.includes(opt)} onChange={(e) => setA(q.id, e.target.checked ? [...arr, opt] : arr.filter((x) => x !== opt))} className="accent-[#662D91]" />{opt}
                      </label>
                    )
                  })}
                </div>
              )}

              {q.type === "text" && (
                <Textarea value={answers[q.id] || ""} onChange={(e) => setA(q.id, e.target.value)} className="min-h-[70px] text-sm" />
              )}
            </div>
          ))}

          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
            <p>{t("surveyPrivacyNotice") || "Tus respuestas serán tratadas por tu empresa para mejorar el servicio, conforme al RGPD. Puedes ejercer tus derechos de acceso, rectificación y supresión."}{survey.anonymous ? ` ${t("surveyAnonymousNotice") || "Esta encuesta es anónima: tus respuestas no se vinculan a tu identidad."}` : ""}</p>
            <label className="flex items-center gap-2 text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4 accent-[#662D91]" />
              <span>{t("acceptPrivacyNotice") || "He leído y acepto el aviso de privacidad"}</span>
            </label>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("cancel") || "Cancelar"}</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#662D91] hover:bg-[#532073] text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}{t("send") || "Enviar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SurveyFill
