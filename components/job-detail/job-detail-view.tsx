"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { AnimatedLoader } from "@/components/animated-loader"
import { ArrowLeft, Calendar, CalendarDays, QrCode, Navigation } from "lucide-react"
import JobsIcon from "@/icons/Menu/Jobs.svg"
import ClientIcon from "@/icons/Menu/clients.svg"

const TABS = [
  { k: "overview", label: "Overview" },
  { k: "schedule", label: "Schedule" },
  { k: "tasks", label: "Tasks" },
  { k: "centres", label: "Work centres" },
  { k: "signin", label: "Sign-in & QR" },
  { k: "survey", label: "Survey" },
  { k: "workers", label: "Workers" },
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
function dayName(n: any) {
  if (n == null || n === "") return ""
  const i = ((Number(n) - 1) % 7 + 7) % 7
  return DAYS[i] || String(n)
}
function hhmm(t?: string | null) {
  if (!t) return "—"
  return String(t).slice(0, 5)
}

function Chip({ tone, children }: { tone: "ok" | "off" | "brand" | "info" | "warn"; children: any }) {
  const c = {
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    off: "bg-muted text-muted-foreground",
    brand: "bg-purple-100 text-[#662D91] dark:bg-purple-950/50 dark:text-purple-300",
    info: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  }[tone]
  return <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c}`}>{children}</span>
}
function Meth({ m }: { m?: string | null }) {
  if (!m) return null
  return <span className="text-[10.5px] font-bold text-[#662D91] dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/50 px-2 py-0.5 rounded uppercase tracking-wide">{m}</span>
}
function KV({ k, children }: { k: string; children: any }) {
  return (
    <div className="flex justify-between items-center gap-3 py-2.5 border-b border-border/70 last:border-0 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-semibold text-right">{children}</span>
    </div>
  )
}
function Card({ title, accent, children }: { title?: string; accent?: string; children: any }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-[0_1px_3px_rgba(30,20,40,.05)] overflow-hidden">
      {accent && <div className="h-1 w-full" style={{ background: accent }} />}
      <div className="p-5">
        {title && <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
function Scale({ value }: { value: number }) {
  const th = Number(value) || 0
  return (
    <div className="flex gap-1 my-2">
      {Array.from({ length: 11 }, (_, i) => (
        <span
          key={i}
          className={`flex-1 text-center text-[11px] font-extrabold py-1.5 rounded ${
            i <= th ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          } ${i === th ? "outline outline-2 outline-[#662D91] -outline-offset-2" : ""}`}
        >
          {i}
        </span>
      ))}
    </div>
  )
}

function SurveyCard({ title, tone, s }: { title: string; tone: "brand" | "info"; s: any }) {
  const { t, language } = useTranslation("job-detail")
  const periodLabel = s.periodicity
    ? `${s.periodicity.charAt(0).toUpperCase()}${s.periodicity.slice(1)}${s.interval ? ` · ${t("jdEvery")} ${s.interval}` : ""}${s.weeklyDays ? ` · ${s.weeklyDays}` : ""}`
    : "—"
  return (
    <Card title={t("jdSurveyHeading", { title: language === "en" ? title : title.toLowerCase() })} accent={tone === "brand" ? "#662D91" : "#4F46E5"}>
      <div className="mb-2"><Chip tone={tone}>{title}</Chip></div>
      <div className="text-[15px] font-bold mb-1">{s.questionText || "—"}</div>
      {s.rateDigit != null && (
        <>
          <div className="text-xs text-muted-foreground">{t("jdSurveyRating", { n: s.rateDigit })}</div>
          <Scale value={s.rateDigit} />
        </>
      )}
      <div className="mt-3">
        <KV k={t("jdMonitoringValue")}>{s.rateDigit ?? "—"}</KV>
        <KV k={t("jdAlertMessage")}>{s.textAlertTracking || "—"}</KV>
        <KV k={t("jdFarewellText")}>{s.greetingText || "—"}</KV>
        <KV k={t("jdPeriodicity")}>{periodLabel}</KV>
      </div>
    </Card>
  )
}

export default function JobDetailView({ jobId, backHref = "/jobs/all" }: { jobId: string; backHref?: string }) {
  const router = useRouter()
  const { isAuthenticated } = useAuth() as any
  const { t } = useTranslation("job-detail")
  const [tab, setTab] = useState("overview")

  // The API returns the raw schedule-type token (free / fixed / seasonal, and
  // the season variants normal / summer). Map it to the canonical label rather
  // than showing the English enum value capitalized to every locale.
  const scheduleLabel = (raw?: string | null): string => {
    switch ((raw || "").toLowerCase()) {
      case "free": return t("schedFree")
      case "fixed": return t("schedScheduled")
      case "seasonal": return t("schedSeasonal")
      case "normal": return t("schedNormal")
      case "summer": return t("schedSummer")
      default: return raw || "—"
    }
  }

  const { data: d = null, isLoading: loading } = useQuery<any>({
    queryKey: ["jobs", "detail", jobId],
    queryFn: async () => (await apiFetch<any>(`/jobs/${jobId}`))?.data ?? null,
    enabled: isAuthenticated && !!jobId,
  })

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><AnimatedLoader size={32} /></div>
  if (!d)
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => router.push(backHref)} className="text-sm text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 mb-4"><ArrowLeft className="w-4 h-4" /> {t("jdBack")}</button>
        <div className="text-center text-muted-foreground py-20">{t("jdJobNotFound")}</div>
      </div>
    )

  const centres = d.workCentersDetail || []
  const workers = d.workersDetail || []
  const tasks = d.tasks || []
  const schedules = d.seasonalSchedules || []
  const methods = d.signingMethods || []
  const qrEnabled = methods.some((m: any) => String(m.methodType || "").toLowerCase().includes("qr"))
  const weekHours = schedules.reduce((s: number, ss: any) => s + (Number(ss.totalWeekHours) || 0), 0)
  const statusActive = ["scheduled", "in_progress", "pending"].includes(String(d.status || "").toLowerCase())
  const dateRange = `${d.startDate ? new Date(d.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"} – ${d.endDate ? new Date(d.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : t("jdOngoing").toLowerCase()}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 pb-24 bg-background min-h-screen">
      <button onClick={() => router.push(backHref)} className="text-sm font-semibold text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 mb-4"><ArrowLeft className="w-4 h-4" /> {t("jdBack")}</button>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-5">
        <div className="p-5 sm:p-6 flex gap-4 items-center flex-wrap text-white" style={{ background: "linear-gradient(120deg,#5a2680 0%,#7c3aad 55%,#9450c9 100%)" }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center ring-1 ring-white/30 shrink-0"><JobsIcon className="w-7 h-7" /></div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[22px] font-extrabold leading-tight">{d.jobName || t("jdJob")}</div>
            <div className="text-[13px] text-white/85 mt-1 flex gap-x-3 gap-y-1 flex-wrap">
              {d.clientName && <span className="inline-flex items-center gap-1.5"><ClientIcon className="w-4 h-4" /> {d.clientName}</span>}
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {dateRange}</span>
              {d.scheduleType && <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {scheduleLabel(d.scheduleType)}</span>}
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-full text-[12.5px] font-bold self-start bg-white/22 backdrop-blur">
            {statusActive ? t("jdActive") : "✓ " + (d.status || "—")}
          </div>
        </div>
        <div className="bg-card grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border">
          {[
            { v: centres.length, l: t("jdStatWorkCentres") },
            { v: workers.length, l: t("jdStatWorkers") },
            { v: tasks.length, l: t("jdStatTasks") },
            { v: weekHours ? `${weekHours}h` : "—", l: t("jdStatPerWeek") },
            { v: d.scheduleType ? scheduleLabel(d.scheduleType) : "—", l: t("jdStatSchedule") },
          ].map((x: any, i: number) => (
            <div key={i} className="p-4 text-center">
              <div className="text-[19px] font-extrabold tabular-nums capitalize">{x.v}</div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs — system canonical style */}
      <div className="border-b border-border mb-5">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(({ k, label }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === k ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {t("jdTab_" + k) || label}
              {k === "tasks" && tasks.length > 0 ? ` (${tasks.length})` : k === "centres" && centres.length > 0 ? ` (${centres.length})` : k === "workers" && workers.length > 0 ? ` (${workers.length})` : ""}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card title={t("jdJobInfo")} accent="#662D91">
            <KV k={t("jdClient")}>{d.clientName || "—"}</KV>
            <KV k={t("jdStatus")}>{statusActive ? <Chip tone="ok">{t("jdActive")}</Chip> : <Chip tone="off">{d.status || "—"}</Chip>}</KV>
            <KV k={t("jdScheduleType")}><span className="capitalize">{d.scheduleType || "—"}</span></KV>
            <KV k={t("jdNote")}>{d.note || "—"}</KV>
          </Card>
          <Card title={t("jdSchedule")} accent="#4F46E5">
            <KV k={t("jdStartDate")}>{d.startDate ? new Date(d.startDate).toLocaleDateString("en-GB") : "—"}</KV>
            <KV k={t("jdEndDate")}>{d.endDate ? new Date(d.endDate).toLocaleDateString("en-GB") : t("jdOngoing")}</KV>
            <KV k={t("jdHoursWeek")}>{weekHours ? `${weekHours} h` : "—"}</KV>
            <KV k={t("jdWorkCentres")}>{centres.length}</KV>
          </Card>
          <Card title={t("jdSignin")} accent="#059669">
            <KV k={t("jdMethods")}>
              <span className="inline-flex gap-1 flex-wrap justify-end">{methods.length ? methods.map((m: any, i: number) => <Meth key={i} m={m.methodType} />) : "—"}</span>
            </KV>
            <KV k={t("jdIdentityCheck")}>{methods.some((m: any) => m.verifyIdentity) ? <Chip tone="ok">{t("jdOn")}</Chip> : <Chip tone="off">{t("jdOff")}</Chip>}</KV>
            <KV k={t("jdTasks")}>{tasks.length}</KV>
            <KV k={t("jdWorkers")}>{workers.length}</KV>
          </Card>
        </div>
      )}

      {/* SCHEDULE */}
      {tab === "schedule" && (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <Card><div className="text-center text-muted-foreground py-4 text-sm">{t("jdNoSchedule")}</div></Card>
          ) : (
            schedules.map((ss: any, si: number) => (
              <Card key={si} title={ss.season ? `${ss.season} · ${ss.totalWeekHours || 0} ${t("jdPerWeekShort")}` : `${t("jdSchedule")} · ${ss.totalWeekHours || 0} ${t("jdPerWeekShort")}`} accent="#4F46E5">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="py-2 font-bold">{t("jdDays")}</th><th className="py-2 font-bold">{t("jdStart")}</th><th className="py-2 font-bold">{t("jdEnd")}</th><th className="py-2 font-bold">{t("jdHours")}</th></tr></thead>
                  <tbody>
                    {(ss.shifts || []).map((sh: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-3">{dayName(sh.startWeekday)}{sh.endWeekday != null && sh.endWeekday !== sh.startWeekday ? ` – ${dayName(sh.endWeekday)}` : ""}</td>
                        <td>{hhmm(sh.baseStartTime)}</td>
                        <td>{hhmm(sh.baseEndTime)}</td>
                        <td className="font-bold">{sh.totalHours ? `${sh.totalHours}h` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TASKS */}
      {tab === "tasks" && (
        <Card title={`${t("jdTasks")} · ${tasks.length}`} accent="#059669">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">{t("jdNoTasks")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground"><th className="py-2 font-bold">{t("jdTask")}</th><th className="py-2 font-bold">{t("jdDuration")}</th><th className="py-2 font-bold">{t("jdTiming")}</th><th className="py-2 font-bold">{t("jdPeriodicity")}</th></tr></thead>
              <tbody>
                {tasks.map((t: any, i: number) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-3">{t.name}{t.note ? <span className="text-muted-foreground text-xs block">{t.note}</span> : null}</td>
                    <td>{t.expectedDuration || "—"}</td>
                    <td className="capitalize">{t.timing || "—"}</td>
                    <td className="capitalize">{t.periodicity || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* CENTRES */}
      {tab === "centres" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {centres.length === 0 ? (
            <Card><div className="text-center text-muted-foreground py-4 text-sm">{t("jdNoCentres")}</div></Card>
          ) : (
            centres.map((wc: any, i: number) => (
              <Card key={i} title={wc.name} accent="#C2740B">
                <KV k={t("jdAddress")}>{wc.address || "—"}</KV>
                <KV k={t("jdGps")}>{wc.isGpsActive ? <Chip tone="ok">✓ {wc.gpsRadius || 100} m</Chip> : <Chip tone="off">{t("jdOff")}</Chip>}</KV>
                <KV k={t("jdIpLock")}>{wc.isIpActive ? <Chip tone="ok">✓ {wc.allowedIp || t("jdSet")}</Chip> : <Chip tone="off">{t("jdOff")}</Chip>}</KV>
              </Card>
            ))
          )}
        </div>
      )}

      {/* SIGN-IN & QR */}
      {tab === "signin" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title={t("jdSigninMethods")} accent="#662D91">
            {methods.length === 0 ? (
              <div className="text-muted-foreground text-sm py-2">{t("jdNoMethods")}</div>
            ) : (
              methods.map((m: any, i: number) => (
                <KV key={i} k={String(m.methodType || "").toUpperCase()}>
                  <span className="inline-flex items-center gap-2"><Chip tone="ok">{t("jdEnabled")}</Chip>{m.verifyIdentity && <Chip tone="warn">{t("jdIdCheck")}</Chip>}</span>
                </KV>
              ))
            )}
          </Card>
          <Card title={t("jdQrCheckin")} accent="#662D91">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${qrEnabled ? "bg-purple-100 text-[#662D91] dark:bg-purple-950/50 dark:text-purple-300" : "bg-muted text-muted-foreground"}`}>
                <QrCode className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{qrEnabled ? <Chip tone="ok">{t("jdQrActivated")}</Chip> : <Chip tone="off">{t("jdQrNotActivated")}</Chip>}</div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {qrEnabled ? t("jdQrNoteEnabled") : t("jdQrNoteDisabled")}
                </p>
              </div>
            </div>
            {qrEnabled && centres.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/70">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2">{t("jdCentresWithQr")}</div>
                {centres.map((wc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="inline-flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-[#662D91]" /> {wc.name}</span>
                    <Chip tone="brand">QR</Chip>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SURVEY */}
      {tab === "survey" && (
        <>
          {!d.workerSurvey && !d.customerSurvey && !d.survey ? (
            <Card><div className="text-center text-muted-foreground py-4 text-sm">{t("jdNoSurvey")}</div></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {d.workerSurvey && <SurveyCard title={t("jdWorker")} tone="brand" s={d.workerSurvey} />}
              {d.customerSurvey && <SurveyCard title={t("jdCustomer")} tone="info" s={d.customerSurvey} />}
              {d.survey && <SurveyCard title={t("jdGeneral")} tone="brand" s={d.survey} />}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">{t("jdSurveyFooter")}</p>
        </>
      )}

      {/* WORKERS */}
      {tab === "workers" && (
        <Card title={`${t("jdWorkers")} · ${workers.length}`} accent="#4F46E5">
          {workers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">{t("jdNoWorkers")}</div>
          ) : (
            <div className="-my-1">
              {workers.map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-border/70 last:border-0">
                  {w.photoUrl ? (
                    <img src={w.photoUrl} alt={w.name || t("jdWorker")} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#662D91] text-white grid place-items-center font-bold text-sm shrink-0">
                      {(w.name || "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{w.name || `${t("jdWorker")} #${w.code}`}</div>
                    <div className="text-xs text-muted-foreground">#{w.code}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
