"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Plus, Trash2, BarChart2, Pencil, Loader2, Play, Square, X, ShieldCheck, Users, Settings } from "lucide-react"
import SurvayIcon from "@/icons/Menu/surveys.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"
import { SurveyResultsView } from "./survey-results-view"

type Audience = "WORKERS" | "CLIENTS"
type QType = "rating" | "yes_no" | "single_choice" | "multi_choice" | "text"

const statusMeta: Record<string, { key: string; fallback: string; cls: string; strip: string; dot: string }> = {
  draft: { key: "draft", fallback: "Borrador", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", strip: "bg-slate-300 dark:bg-slate-600", dot: "bg-slate-400" },
  active: { key: "active", fallback: "Activa", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", strip: "bg-emerald-500", dot: "bg-emerald-500" },
  closed: { key: "closed", fallback: "Cerrada", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300", strip: "bg-red-400", dot: "bg-red-500" },
}

interface QDraft { text: string; type: QType; required: boolean; options: string[] }

const emptyQuestion = (): QDraft => ({ text: "", type: "rating", required: true, options: [] })

export function EmployerSurveys({ audience }: { audience: Audience }) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [resultsId, setResultsId] = useState<string | null>(null)
  const [filter, setFilter] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)

  const auth = { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" }

  const { data: rawList = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["survey-forms", "list"],
    queryFn: async () => {
      const j = await apiFetch<any>("/survey-forms")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: !!session?.accessToken,
  })
  const list = useMemo(() => rawList.filter((s: any) => s.audience === audience), [rawList, audience])
  const load = () => queryClient.invalidateQueries({ queryKey: ["survey-forms", "list"] })

  const setStatus = async (s: any, status: string) => {
    const res = await fetch(`${base}/survey-forms/${s.id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ status }) })
    if (!res.ok) { toast({ title: t("error") || "Error", variant: "destructive" }); return }
    toast({ title: t("saved") || "Guardado", variant: "success" }); load()
  }

  const remove = async (s: any) => {
    if (!confirm(t("confirmDelete") || "¿Eliminar?")) return
    const res = await fetch(`${base}/survey-forms/${s.id}`, { method: "DELETE", headers: auth })
    if (!res.ok) { toast({ title: t("error") || "Error", variant: "destructive" }); return }
    toast({ title: t("deleted") || "Eliminada", variant: "success" }); load()
  }

  return (
    <div className="w-full px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("surveys") || "Encuestas"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {audience === "WORKERS" ? (t("workerSurveysSubtitle") || "Encuestas para trabajadores") : (t("clientSurveysSubtitle") || "Encuestas para clientes")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSettingsOpen(true)} variant="outline" size="sm" className="h-9 w-9 p-0" title={t("retentionTitle") || "Conservación"}><Settings className="h-4 w-4" /></Button>
          <Button onClick={() => { setEditing(null); setBuilderOpen(true) }} className="bg-[#662D91] hover:bg-[#532073] text-white h-9 text-sm">
            <Plus className="h-4 w-4 mr-1.5" />{t("createSurvey") || "Crear encuesta"}
          </Button>
        </div>
      </div>

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
          {(["active", "draft", "closed"] as const).map((st) => {
            const sm = statusMeta[st]
            const activeF = filter === st
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(activeF ? "" : st)}
                className={`text-left bg-card border rounded-xl shadow-sm px-4 py-3 transition-all hover:shadow-md ${activeF ? "border-[#662D91] ring-1 ring-[#662D91]" : "border-border"}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sm.dot}`} />
                  <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{list.filter((s) => s.status === st).length}</span>
                </div>
                <div className={`text-[11px] uppercase tracking-wide font-semibold mt-1.5 truncate ${activeF ? "text-[#662D91]" : "text-muted-foreground"}`}>{t(sm.key) || sm.fallback}</div>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><AnimatedLoader /></div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><SurvayIcon className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">{t("noSurveysYet") || "Aún no hay encuestas."}</p>
          <Button onClick={() => { setEditing(null); setBuilderOpen(true) }} variant="outline" className="mt-1 h-9 text-sm"><Plus className="h-4 w-4 mr-1.5" />{t("createSurvey") || "Crear encuesta"}</Button>
        </div>
      ) : (filter ? list.filter((s) => s.status === filter) : list).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground/50"><SurvayIcon className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">{t("noResults") || "Sin resultados"}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(filter ? list.filter((s) => s.status === filter) : list).map((s) => {
            const sm = statusMeta[s.status] || statusMeta.draft
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className={`h-1 ${sm.strip}`} />
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#662D91]/10 text-[#662D91] shrink-0"><SurvayIcon className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{s.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"><Users className="h-3 w-3" />{s.audience === "WORKERS" ? (t("workers") || "Trabajadores") : (t("clients") || "Clientes")}</span>
                          {s.anonymous && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-[#662D91] dark:bg-purple-950/50"><ShieldCheck className="h-3 w-3" />{t("anonymous") || "Anónima"}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sm.cls}`}>{t(sm.key) || sm.fallback}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2"><b className="text-foreground">{t("description") || "Descripción"}:</b> {s.description || "—"}</div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span><b className="text-foreground tabular-nums">{s.questions?.length || 0}</b> {t("questions") || "preguntas"}</span>
                    <span><b className="text-foreground tabular-nums">{s.responseCount || 0}</b> {t("responses") || "respuestas"}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <b className="text-foreground">{t("period") || "Periodo"}:</b> {s.startDate || s.endDate ? `${s.startDate ? formatLocalDate(s.startDate) : "—"}${s.endDate ? ` → ${formatLocalDate(s.endDate)}` : ""}` : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1 px-3 py-2 border-t border-border bg-muted/20">
                  <button onClick={() => setResultsId(s.id)} title={t("results") || "Resultados"} className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950"><BarChart2 className="h-4 w-4" />{t("results") || "Resultados"}</button>
                  {s.status === "draft" && <button onClick={() => { setEditing(s); setBuilderOpen(true) }} title={t("edit") || "Editar"} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>}
                  {s.status !== "active" ? (
                    <button onClick={() => setStatus(s, "active")} title={t("activate") || "Activar"} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"><Play className="h-4 w-4" /></button>
                  ) : (
                    <button onClick={() => setStatus(s, "closed")} title={t("close") || "Cerrar"} className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50"><Square className="h-4 w-4" /></button>
                  )}
                  <button onClick={() => remove(s)} title={t("delete") || "Eliminar"} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 ml-auto"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {builderOpen && (
        <SurveyBuilderDialog
          audience={audience}
          editing={editing}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => { setBuilderOpen(false); load() }}
        />
      )}

      {settingsOpen && <RetentionSettingsDialog onClose={() => setSettingsOpen(false)} />}

      <Dialog open={!!resultsId} onOpenChange={(o) => !o && setResultsId(null)}>
        <DialogContent className="w-full max-w-[94vw] sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">{t("results") || "Resultados"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 flex-1 overflow-y-auto">
            {resultsId && <SurveyResultsView surveyId={resultsId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SurveyBuilderDialog({ audience, editing, onClose, onSaved }: { audience: Audience; editing: any | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL

  const [title, setTitle] = useState(editing?.title || "")
  const [description, setDescription] = useState(editing?.description || "")
  const [anonymous, setAnonymous] = useState<boolean>(editing ? !!editing.anonymous : audience === "WORKERS")
  const [startDate, setStartDate] = useState(editing?.startDate || "")
  const [endDate, setEndDate] = useState(editing?.endDate || "")
  const [questions, setQuestions] = useState<QDraft[]>(
    editing?.questions?.length
      ? editing.questions.map((q: any) => ({ text: q.text, type: q.type, required: q.required, options: Array.isArray(q.options) ? q.options : [] }))
      : [emptyQuestion()],
  )
  const [saving, setSaving] = useState(false)

  const typeLabel = (v: QType) =>
    ({ rating: t("ratingType") || "Valoración (0–10)", yes_no: t("yesNoType") || "Sí / No", single_choice: t("singleChoiceType") || "Opción única", multi_choice: t("multiChoiceType") || "Opción múltiple", text: t("textType") || "Texto libre" } as Record<QType, string>)[v]

  const updateQ = (i: number, patch: Partial<QDraft>) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  const removeQ = (i: number) => setQuestions((qs) => qs.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!session?.accessToken) return
    if (!title.trim()) { toast({ title: t("titleRequired") || "Indica un título", variant: "destructive" }); return }
    if (questions.some((q) => !q.text.trim())) { toast({ title: t("questionTextRequired") || "Cada pregunta necesita texto", variant: "destructive" }); return }
    if (questions.some((q) => (q.type === "single_choice" || q.type === "multi_choice") && q.options.filter((o) => o.trim()).length < 2)) {
      toast({ title: t("choiceNeedsOptions") || "Las preguntas de opción necesitan al menos 2 opciones", variant: "destructive" }); return
    }
    const payload = {
      title, description, audience, anonymous,
      startDate: startDate || undefined, endDate: endDate || undefined,
      questions: questions.map((q) => ({ text: q.text, type: q.type, required: q.required, options: (q.type === "single_choice" || q.type === "multi_choice") ? q.options.filter((o) => o.trim()) : undefined })),
    }
    setSaving(true)
    try {
      const url = editing ? `${base}/survey-forms/${editing.id}` : `${base}/survey-forms`
      const res = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      toast({ title: editing ? (t("saved") || "Guardado") : (t("surveyCreated") || "Encuesta creada"), variant: "success" })
      onSaved()
    } catch {
      toast({ title: t("error") || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-[94vw] sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
            {editing ? (t("editSurvey") || "Editar encuesta") : (t("createSurvey") || "Crear encuesta")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 flex-1 overflow-y-auto space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t("title") || "Título"}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" placeholder={t("surveyTitlePlaceholder") || "p. ej. Encuesta de satisfacción"} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t("description") || "Descripción"} <span className="font-normal">({t("optional") || "Opcional"})</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[60px] text-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("startDate") || "Fecha de inicio"} <span className="font-normal">({t("optional") || "Opcional"})</span></Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t("endDate") || "Fecha de fin"} <span className="font-normal">({t("optional") || "Opcional"})</span></Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4 accent-[#662D91]" />
            <span>{t("anonymousResponses") || "Respuestas anónimas"}</span>
            {audience === "WORKERS" && <span className="text-xs text-muted-foreground">({t("recommended") || "Recomendado"})</span>}
          </label>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{t("questionsTitle") || "Preguntas"}</div>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
                <Plus className="h-3.5 w-3.5 mr-1" />{t("addQuestion") || "Añadir pregunta"}
              </Button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2.5 bg-muted/20">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mt-2.5 w-5 shrink-0">{i + 1}.</span>
                  <Input value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} className="h-9" placeholder={t("questionText") || "Texto de la pregunta"} />
                  {questions.length > 1 && <button onClick={() => removeQ(i)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md shrink-0"><X className="h-4 w-4" /></button>}
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-7">
                  <Select value={q.type} onValueChange={(v) => updateQ(i, { type: v as QType })}>
                    <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["rating", "yes_no", "single_choice", "multi_choice", "text"] as QType[]).map((tp) => <SelectItem key={tp} value={tp}>{typeLabel(tp)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQ(i, { required: e.target.checked })} className="h-3.5 w-3.5 accent-[#662D91]" />
                    {t("required") || "Obligatoria"}
                  </label>
                </div>
                {(q.type === "single_choice" || q.type === "multi_choice") && (
                  <div className="pl-7 space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <Input value={opt} onChange={(e) => updateQ(i, { options: q.options.map((o, x) => (x === oi ? e.target.value : o)) })} className="h-8 text-sm" placeholder={`${t("option") || "Opción"} ${oi + 1}`} />
                        <button onClick={() => updateQ(i, { options: q.options.filter((_, x) => x !== oi) })} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => updateQ(i, { options: [...q.options, ""] })}><Plus className="h-3 w-3 mr-1" />{t("addOption") || "Añadir opción"}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("cancel") || "Cancelar"}</Button>
          <Button onClick={submit} disabled={saving} className="bg-[#662D91] hover:bg-[#532073] text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}{t("save") || "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RetentionSettingsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const [days, setDays] = useState("")
  const [saving, setSaving] = useState(false)

  // Read seeds the editable `days` field (retry + refetch via React Query).
  const { data: settings, isLoading: loading } = useQuery<any>({
    queryKey: ["survey-forms", "settings"],
    queryFn: async () => (await apiFetch<any>("/survey-forms/settings"))?.data ?? null,
    enabled: !!session?.accessToken,
  })
  useEffect(() => {
    if (settings === undefined) return
    setDays(settings?.retentionDays != null ? String(settings.retentionDays) : "")
  }, [settings])

  const save = async () => {
    if (!session?.accessToken) return
    setSaving(true)
    try {
      const res = await fetch(`${base}/survey-forms/settings`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays: days === "" ? null : Number(days) }),
      })
      if (!res.ok) throw new Error()
      toast({ title: t("saved") || "Guardado", variant: "success" })
      onClose()
    } catch {
      toast({ title: t("error") || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-[94vw] sm:max-w-md p-0 gap-0 max-h-[90vh] overflow-y-auto flex flex-col bg-background">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">{t("retentionTitle") || "Conservación de respuestas"}</DialogTitle>
        </DialogHeader>
        <div className="px-6 py-5 space-y-3">
          {loading ? (
            <div className="flex justify-center py-6"><AnimatedLoader /></div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t("retentionDaysLabel") || "Eliminar respuestas después de (días)"}</Label>
                <Input type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} className="h-9" placeholder="0" />
              </div>
              <p className="text-xs text-muted-foreground">{t("retentionHelp") || "Deja vacío o 0 para conservar indefinidamente."}</p>
            </>
          )}
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("cancel") || "Cancelar"}</Button>
          <Button onClick={save} disabled={saving || loading} className="bg-[#662D91] hover:bg-[#532073] text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}{t("save") || "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EmployerSurveys
