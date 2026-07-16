"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ShieldCheck, MessageSquare, Star } from "lucide-react"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate } from "@/lib/datetime"

export function SurveyResultsView({ surveyId }: { surveyId: string }) {
  const { t } = useTranslation()
  const { status } = useSession()

  const { data = null, isLoading: loading } = useQuery<any | null>({
    queryKey: ["survey-forms", surveyId, "results"],
    queryFn: async () => (await apiFetch<any>(`/survey-forms/${surveyId}/results`))?.data ?? null,
    enabled: status === "authenticated" && !!surveyId,
  })

  if (loading) return <div className="flex justify-center py-12"><AnimatedLoader /></div>
  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">{t("error") || "Error"}</p>

  const Bar = ({ label, count, max }: { label: string; count: number; max: number }) => {
    const pct = max ? Math.round((count / max) * 100) : 0
    return (
      <div className="flex items-center gap-3 text-xs">
        <span className="w-28 shrink-0 truncate text-foreground">{label}</span>
        <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#662D91] to-[#8b4fc0] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-10 text-right tabular-nums font-medium text-muted-foreground">{count}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 shadow-sm">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-foreground truncate">{data.form?.title}</div>
          {data.anonymous && <span className="inline-flex items-center gap-1 text-[11px] font-medium mt-1 px-2 py-0.5 rounded-full bg-purple-50 text-[#662D91] dark:bg-purple-950/50"><ShieldCheck className="h-3 w-3" />{t("anonymous") || "Anónima"}</span>}
        </div>
        <div className="text-center shrink-0">
          <div className="text-3xl font-bold tabular-nums text-[#662D91] leading-none">{data.total}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mt-1">{t("responses") || "respuestas"}</div>
        </div>
      </div>

      {data.total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noResponsesYet") || "Aún no hay respuestas."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data.questions || []).map((q: any, i: number) => (
            <div key={q.id} className="rounded-xl border border-border p-4 space-y-3 bg-card shadow-sm">
              <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#662D91]/10 text-[#662D91] text-xs font-semibold">{i + 1}</span>
                <div className="text-sm font-semibold text-foreground pt-0.5">{q.text}</div>
              </div>

              {q.type === "rating" && (
                <div className="space-y-2 pl-8">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                    <span className="text-2xl font-bold text-foreground tabular-nums">{q.average}</span>
                    <span className="text-xs text-muted-foreground">/ 10 · {q.count} {t("responses") || "respuestas"}</span>
                  </div>
                  {Object.keys(q.distribution || {}).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {Object.entries(q.distribution).sort((a, b) => Number(b[0]) - Number(a[0])).map(([val, cnt]: any) => (
                        <Bar key={val} label={`★ ${val}`} count={cnt} max={Math.max(...Object.values(q.distribution).map(Number))} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {q.type === "yes_no" && (
                <div className="space-y-1.5 pl-8">
                  <Bar label={t("yes") || "Sí"} count={q.yes} max={Math.max(q.yes, q.no, 1)} />
                  <Bar label={t("no") || "No"} count={q.no} max={Math.max(q.yes, q.no, 1)} />
                </div>
              )}

              {(q.type === "single_choice" || q.type === "multi_choice") && (
                <div className="space-y-1.5 pl-8">
                  {Object.entries(q.tally || {}).map(([opt, cnt]: any) => (
                    <Bar key={opt} label={opt} count={cnt} max={Math.max(...Object.values(q.tally || { x: 1 }).map(Number), 1)} />
                  ))}
                </div>
              )}

              {q.type === "text" && (
                <div className="space-y-1.5 pl-8">
                  {(q.texts || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    (q.texts || []).map((txt: string, k: number) => (
                      <div key={k} className="text-xs rounded-lg border border-border bg-muted/30 px-3 py-2 whitespace-pre-wrap text-foreground">{txt}</div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {!data.anonymous && (data.responses || []).length > 0 && (
            <div className="pt-1">
              <div className="text-sm font-semibold mb-2 text-foreground">{t("individualResponses") || "Respuestas individuales"}</div>
              <div className="space-y-2">
                {data.responses.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-border p-3 text-xs space-y-1.5 bg-card">
                    <div className="text-muted-foreground font-medium">{formatLocalDate(r.submittedAt)}</div>
                    {r.answers.map((a: any, k: number) => (
                      <div key={k} className="flex gap-1.5"><b className="text-foreground shrink-0">{a.questionText}:</b> <span className="text-muted-foreground">{String(Array.isArray(a.value) ? a.value.join(", ") : a.value === true ? (t("yes") || "Sí") : a.value === false ? (t("no") || "No") : a.value)}</span></div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SurveyResultsView
