"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { AnimatedLoader } from "@/components/animated-loader"
import { ArrowLeft, Clock, Coffee, ListChecks, MapPin, ClipboardList, ShieldCheck, LayoutGrid, LogIn, LogOut, Download, PencilLine, Calendar } from "lucide-react"
import JobsIcon from "@/icons/Menu/Jobs.svg"
import ClientIcon from "@/icons/Menu/clients.svg"
import BuildingsIcon from "@/icons/Menu/buildings.svg"
import LocationMap from "./location-map"
import SurveyFillDialog from "@/components/surveys/survey-fill-dialog"
import { surveyStatus as fetchSurveyStatus, SurveyStatus, SurveyEntry } from "@/lib/survey-client"
import ManualAttendanceRequestForm from "@/components/manual-attendance/manual-attendance-request-form"

const TABS = [
  { k: "summary", Icon: LayoutGrid },
  { k: "checkins", Icon: Clock },
  { k: "breaks", Icon: Coffee },
  { k: "tasks", Icon: ListChecks },
  { k: "location", Icon: MapPin },
  { k: "survey", Icon: ClipboardList },
  { k: "audit", Icon: ShieldCheck },
]

function fmtMin(m: number) {
  const h = Math.floor((m || 0) / 60)
  const mm = (m || 0) % 60
  return `${h}h ${String(mm).padStart(2, "0")}m`
}
function fmtDate(s?: string) {
  if (!s) return "—"
  try {
    return new Date(s).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
  } catch {
    return s
  }
}
function parseAddress(loc?: string | null) {
  if (!loc) return null
  try {
    const o = JSON.parse(loc)
    return o.address || o.location || null
  } catch {
    return loc.length < 120 ? loc : null
  }
}

function Meth({ m }: { m?: string | null }) {
  if (!m) return null
  return <span className="text-[10.5px] font-bold text-[#662D91] dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/50 px-2 py-0.5 rounded uppercase tracking-wide">{m}</span>
}
function Chip({ tone, children }: { tone: "ok" | "late" | "no" | "grey" | "brand" | "warn"; children: any }) {
  const c = {
    ok: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    late: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    warn: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    no: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    grey: "bg-muted text-muted-foreground",
    brand: "bg-purple-100 text-[#662D91] dark:bg-purple-950/50 dark:text-purple-300",
  }[tone]
  return <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c}`}>{children}</span>
}
function Punct({ p, out }: { p: any; out?: boolean }) {
  const { t } = useTranslation("record-detail")
  if (!p) return <Chip tone="grey">—</Chip>
  if (p.status === "onTime") return <Chip tone="ok">{t("punctOnTime")}</Chip>
  if (p.status === "late") return <Chip tone="late">+{p.minutes}m {out ? t("punctAfter") : t("punctLate")}</Chip>
  return <Chip tone={out ? "late" : "ok"}>{p.minutes}m {out ? t("punctEarlyLeave") : t("punctEarly")}</Chip>
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

function SurveyStatusCard({ title, entry, onFill }: { title: string; entry: SurveyEntry | null; onFill: (e: SurveyEntry) => void }) {
  const { t } = useTranslation("record-detail")
  if (!entry) {
    return <Card title={title}><div className="text-sm text-muted-foreground py-4 text-center">{t("survCardNotConfigured")}</div></Card>
  }
  const r = entry.response
  const belowThreshold = entry.rateDigit != null && r?.rating != null && r.rating <= entry.rateDigit
  return (
    <Card title={title} accent="#662D91">
      <div className="text-[15px] font-semibold mb-3">{entry.questionText || t("survCardRating")}</div>
      {entry.filled && r ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#662D91] dark:text-purple-300">{r.rating}<span className="text-sm text-muted-foreground">/10</span></span>
            {belowThreshold && <Chip tone="warn">{t("survCardBelowThreshold")}</Chip>}
          </div>
          {r.comment && <div className="text-sm"><span className="text-muted-foreground">{t("survCardReason")}</span>{r.comment}</div>}
          <div className="text-xs text-muted-foreground">{t("survCardSent")} {fmtDate(r.submittedAt)} · {t("survCardBy")} {r.by === "worker" ? t("survCardWorker") : r.by === "client" ? t("survCardClient") : "—"}</div>
        </div>
      ) : (
        <div className="space-y-3">
          <Chip tone="no">{t("survCardPending")}</Chip>
          {entry.canFill ? (
            <button onClick={() => onFill(entry)} className="block w-full rounded-xl px-4 py-2.5 text-[12.5px] font-bold bg-[#662D91] text-white hover:bg-[#57267c] transition-colors">{t("survCardFill")}</button>
          ) : (
            <div className="text-xs text-muted-foreground">{t("survCardNotAnswered")}</div>
          )}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground mt-3">{t("survCardPeriodicity")}: {entry.periodicity}</div>
    </Card>
  )
}

export default function RecordDetail({ recordId, backHref }: { recordId: string; backHref: string }) {
  const router = useRouter()
  const { session } = useAuth() as any
  const { t } = useTranslation("record-detail")
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("summary")
  const [survey, setSurvey] = useState<SurveyStatus | null>(null)
  const [surveyDialog, setSurveyDialog] = useState<{ entry: SurveyEntry; title: string } | null>(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)

  useEffect(() => {
    if (!session?.accessToken || !recordId) return
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/record/${recordId}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setD(j?.data || null))
      .catch(() => setD(null))
      .finally(() => setLoading(false))
  }, [session?.accessToken, recordId])

  const loadSurvey = () => {
    if (!session?.accessToken || !d?.job?.publicId) return
    fetchSurveyStatus(session.accessToken, d.job.publicId, d.date).then(setSurvey)
  }
  useEffect(() => {
    loadSurvey()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, d?.job?.publicId, d?.date])

  const handleExportPdf = () => {
    if (!d) return
    const h = d.hours || {}
    const ci = d.scans?.find((s: any) => s.scanType === "check-in")
    const esc = (v: any) => (v == null || v === "" ? "—" : String(v).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string)))
    const row = (k: string, v: any) => `<tr><td class="k">${k}</td><td class="v">${esc(v)}</td></tr>`
    const tasksRows = (d.tasks || []).map((task: any) => `<tr><td>${esc(task.name)}</td><td>${task.completed ? t("pdfCompletada") : t("pdfPendiente")}</td></tr>`).join("")
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${t("pdfClockIn")} ${esc(d.worker?.name)} ${esc(d.date)}</title>
      <style>
        *{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;box-sizing:border-box}
        body{margin:32px;color:#1e1428}
        h1{font-size:20px;margin:0 0 2px}.sub{color:#6b6478;font-size:13px;margin-bottom:20px}
        .band{background:#662D91;color:#fff;border-radius:10px;padding:14px 18px;margin-bottom:18px}
        .band h1{color:#fff}.band .sub{color:#e9ddf5;margin:0}
        h2{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#662D91;margin:18px 0 6px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        td{padding:6px 8px;border-bottom:1px solid #eee}
        td.k{color:#6b6478;width:45%}td.v{text-align:right;font-weight:600}
        .foot{margin-top:24px;color:#9a93a6;font-size:11px;border-top:1px solid #eee;padding-top:10px}
      </style></head><body>
      <div class="band"><h1>${esc(d.worker?.name)}</h1><div class="sub">${esc(d.job?.name)} · ${esc(d.client)} · ${esc(d.date)}</div></div>
      <h2>${t("pdfClockIn")}</h2><table>
        ${row(t("checkIn"), `${esc(d.checkIn)}${d.checkInMethod ? " (" + d.checkInMethod + ")" : ""}`)}
        ${row(t("checkOut"), d.checkOut ? `${d.checkOut}${d.checkOutMethod ? " (" + d.checkOutMethod + ")" : ""}` : t("pdfEnProgreso"))}
        ${row(t("pdfCentro"), d.workCenter)}
        ${row(t("pdfDescansoTotal"), fmtMin(h.breakMinutes || 0))}
      </table>
      <h2>${t("hours")}</h2><table>
        ${row(t("pdfProgramado"), fmtMin(h.scheduledMinutes || 0))}
        ${row(t("pdfTrabajado"), fmtMin(h.workedMinutes || 0))}
        ${row(t("pdfHorasExtra"), h.overtimeMinutes ? fmtMin(h.overtimeMinutes) : "0h")}
      </table>
      <h2>${t("verification")}</h2><table>
        ${row(t("method"), d.checkInMethod)}
        ${row("GPS", ci?.latitude != null ? `${ci.latitude}, ${ci.longitude}` : "—")}
        ${row("IP", ci?.ipAddress)}
        ${row(t("biometric"), d.webauthnVerified ? t("verified").replace(/^✓ ?/, "") : "—")}
        ${row(t("location"), d.locationUnavailable ? t("pdfNoDisponibleRevisar") : ci?.latitude != null ? t("pdfRegistrada") : "—")}
      </table>
      ${(d.tasks || []).length ? `<h2>${t("tasks")}</h2><table>${tasksRows}</table>` : ""}
      <h2>${t("traceability")}</h2><table>
        ${row(t("origin"), d.source === "MANUAL" ? t("pdfEntradaManual") : t("pdfFichajeRealScan"))}
        ${row(t("created"), fmtDate(d.createdAt))}
        ${row(t("lastModified"), fmtDate(d.updatedAt))}
        ${row(t("corrections"), (d.correctionHistory || []).length ? `${d.correctionHistory.length}` : t("pdfNinguna"))}
      </table>
      ${d.integrityHash ? `<h2>${t("pdfSelloIntegridad")}</h2><div style="font-size:10px;font-family:monospace;word-break:break-all;background:#f4f2f7;padding:8px;border-radius:6px">${esc(d.integrityHash)}</div>` : ""}
      <div class="foot">${t("pdfFoot")} ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}</div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`
    const w = window.open("", "_blank", "width=800,height=900")
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><AnimatedLoader size={32} /></div>
  if (!d)
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => router.push(backHref)} className="text-sm text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("backToRecords")}
        </button>
        <div className="text-center text-muted-foreground py-20">{t("recordNotFound")}</div>
      </div>
    )

  const h = d.hours || {}
  const checkInScan = (d.scans || []).find((s: any) => s.scanType === "check-in")
  const doneTasks = (d.tasks || []).filter((t: any) => t.completed).length
  const totalTasks = (d.tasks || []).length
  // A record counts as corrected only when it was created/edited manually (source MANUAL).
  const corrected = d.source === "MANUAL"
  const initials = (d.worker?.name || "?").split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase()
  const diff = (h.workedMinutes || 0) - (h.scheduledMinutes || 0)

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-5 pb-24 bg-background min-h-screen">
      <button onClick={() => router.push(backHref)} className="text-sm font-semibold text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft className="w-4 h-4" /> {t("backToRecords")}
      </button>

      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-5">
        <div className="relative p-5 sm:p-6 flex gap-4 items-center flex-wrap text-white" style={{ background: "linear-gradient(120deg,#5a2680 0%,#7c3aad 55%,#9450c9 100%)" }}>
          {d.worker?.photoUrl ? (
            <img src={d.worker.photoUrl} alt={d.worker?.name || "Worker"} className="w-14 h-14 rounded-2xl object-cover ring-1 ring-white/30 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center font-extrabold text-xl ring-1 ring-white/30 shrink-0">{initials}</div>
          )}
          <div className="flex-1 min-w-[200px]">
            <div className="text-[22px] font-extrabold leading-tight">{d.worker?.name || `#${d.worker?.code}`}</div>
            <div className="text-[13px] text-white/85 mt-1 flex gap-x-3 gap-y-1 flex-wrap">
              {d.job?.name && <span className="inline-flex items-center gap-1.5"><JobsIcon className="w-4 h-4" /> {d.job.name}</span>}
              {d.workCenter && <span className="inline-flex items-center gap-1.5"><BuildingsIcon className="w-4 h-4" /> {d.workCenter}</span>}
              {d.client && <span className="inline-flex items-center gap-1.5"><ClientIcon className="w-4 h-4" /> {d.client}</span>}
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {d.date}</span>
            </div>
          </div>
          <div className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold self-start backdrop-blur ${d.isActive ? "bg-white/25" : "bg-white/20"}`}>
            {d.isActive ? t("inProgress") : t("completed")}
          </div>
        </div>
        <div className="bg-card grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-border">
          {[
            { v: d.checkIn || "—", l: t("checkIn"), Icon: LogIn },
            { v: d.checkOut || "—", l: t("checkOut"), Icon: LogOut },
            { v: h.hasSchedule ? fmtMin(h.scheduledMinutes) : "—", l: t("scheduled") },
            { v: fmtMin(h.workedMinutes), l: t("actual") },
            { v: !h.hasSchedule ? "—" : h.overtimeMinutes ? fmtMin(h.overtimeMinutes) : "0h", l: t("overtime"), warn: h.hasSchedule && h.overtimeMinutes > 0 },
          ].map((x: any, i: number) => (
            <div key={i} className="p-4 text-center">
              <div className={`text-[19px] font-extrabold tabular-nums ${x.warn ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{x.v}</div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs — system canonical style */}
      <div className="border-b border-border mb-5">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {TABS.map(({ k }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === k
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {t("tab_" + k)}
              {k === "checkins" ? ` (${(d.scans || []).length})` : k === "breaks" ? ` (${(d.breaks || []).length})` : k === "tasks" && totalTasks > 0 ? ` (${doneTasks}/${totalTasks})` : ""}
            </button>
          ))}
        </nav>
      </div>

      {/* SUMMARY */}
      {tab === "summary" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title={t("checkInOut")} accent="#059669">
            <KV k={t("checkIn")}><span className="inline-flex items-center gap-1.5 flex-wrap justify-end">{d.checkIn || "—"} <Meth m={d.checkInMethod} /> <Punct p={d.punctuality?.in} /></span></KV>
            <KV k={t("checkOut")}><span className="inline-flex items-center gap-1.5 flex-wrap justify-end">{d.checkOut || "—"} <Meth m={d.checkOutMethod} /> {d.checkOut && <Punct p={d.punctuality?.out} out />}</span></KV>
            <KV k={t("totalBreak")}>{fmtMin(h.breakMinutes)}</KV>
            <KV k={t("workCentre")}>{d.workCenter || "—"}</KV>
          </Card>
          <Card title={t("hours")} accent="#662D91">
            <KV k={t("scheduled")}>{h.hasSchedule ? fmtMin(h.scheduledMinutes) : <span className="text-muted-foreground">{t("flexible")}</span>}</KV>
            <KV k={t("actualWorked")}>{fmtMin(h.workedMinutes)}</KV>
            <KV k={t("overtime")}>{!h.hasSchedule ? "—" : h.overtimeMinutes ? <span className="text-amber-600 dark:text-amber-400">{fmtMin(h.overtimeMinutes)}</span> : "0h"}</KV>
            <KV k={t("difference")}>{h.hasSchedule ? <Chip tone={diff >= 0 ? "ok" : "grey"}>{(diff >= 0 ? "+" : "−") + fmtMin(Math.abs(diff))}</Chip> : "—"}</KV>
          </Card>
          <Card title={t("dayStatus")} accent="#4F46E5">
            <KV k={t("tasks")}>{totalTasks ? <Chip tone={doneTasks === totalTasks ? "ok" : "late"}>{doneTasks} / {totalTasks} {t("done")}</Chip> : "—"}</KV>
            <KV k={t("survey")}>{(() => {
              const items = [survey?.worker, survey?.customer].filter(Boolean) as any[]
              if (items.length === 0) return "—"
              const allFilled = items.every((s) => s.filled)
              const anyFilled = items.some((s) => s.filled)
              return allFilled ? <Chip tone="ok">{t("surveySent")}</Chip> : anyFilled ? <Chip tone="late">{t("surveyPartial")}</Chip> : <Chip tone="no">{t("surveyPending")}</Chip>
            })()}</KV>
            <KV k={t("corrections")}>{corrected ? <Chip tone="late">{t("manualEdit")}</Chip> : t("none")}</KV>
            <KV k={t("origin")}>{d.source === "MANUAL" ? t("manualEntry") : t("realScan")}</KV>
          </Card>
          <Card title={t("verification")} accent="#C2740B">
            <KV k={t("method")}><span className="inline-flex items-center gap-1.5"><Meth m={d.checkInMethod} />{d.workCenter ? <span className="text-sm text-foreground">{d.workCenter}</span> : null}</span></KV>
            <KV k="GPS">{checkInScan?.latitude != null ? <Chip tone="ok">{t("captured")}</Chip> : <Chip tone="grey">—</Chip>}</KV>
            <KV k="IP">{checkInScan?.ipAddress || "—"}</KV>
            <KV k={t("biometric")}>{d.webauthnVerified ? <Chip tone="ok">{t("verified")}</Chip> : <Chip tone="grey">—</Chip>}</KV>
          </Card>
        </div>
      )}

      {/* CHECK-INS timeline */}
      {tab === "checkins" && (
        <div className="w-full">
          <Card>
            {(d.scans || []).length === 0 ? (
              <div className="text-center text-muted-foreground py-6 text-sm">{t("noScanEvents")}</div>
            ) : (
              <div className="relative pl-7">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
                {(d.scans || []).map((s: any, i: number) => {
                  const isIn = s.scanType === "check-in"
                  const isOut = s.scanType === "check-out"
                  const dot = isIn ? "bg-emerald-500" : isOut ? "bg-red-500" : "bg-amber-500"
                  const label = isIn ? t("checkIn") : isOut ? t("checkOut") : s.scanType === "break-start" ? t("breakStart") : s.scanType === "break-end" ? t("breakEnd") : s.scanType
                  const addr = parseAddress(s.location)
                  return (
                    <div key={i} className="relative py-3">
                      <div className={`absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full ring-4 ring-card ${dot}`} />
                      <div className="text-[15px] font-extrabold tabular-nums">{s.time} · {label}</div>
                      <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        {s.workCenter && <span>{s.workCenter}</span>}
                        {s.method && <Meth m={s.method} />}
                        {s.latitude != null && <span>· GPS {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</span>}
                        {s.ipAddress && <span>· IP {s.ipAddress}</span>}
                        {addr && <span>· {addr}</span>}
                        {s.notes && <span>· {s.notes}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* BREAKS */}
      {tab === "breaks" && (
        <div className="w-full">
          <Card title={t("breaks")}>
            {(d.breaks || []).length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">{t("noBreaks")}</div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 font-bold">#</th><th className="py-2 font-bold">{t("start")}</th><th className="py-2 font-bold">{t("end")}</th><th className="py-2 font-bold">{t("duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.breaks || []).map((b: any, i: number) => (
                      <tr key={i} className="border-t border-border"><td className="py-3">{i + 1}</td><td>{b.start}</td><td>{b.end}</td><td className="font-bold">{b.durationMinutes} {t("min")}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3"><KV k={t("totalBreaks")}>{fmtMin(h.breakMinutes)}</KV><KV k={t("deducted")}>{t("yes")}</KV></div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* TASKS */}
      {tab === "tasks" && (
        <div className="w-full">
          <Card title={totalTasks ? `${t("jobTasks")} · ${doneTasks} ${t("of")} ${totalTasks} ${t("completedLower")}` : t("jobTasks")}>
            {totalTasks === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">{t("noTasksDefined")}</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-bold">{t("task")}</th><th className="py-2 font-bold">{t("status")}</th><th className="py-2 font-bold">{t("time")}</th><th className="py-2 font-bold">{t("by")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.tasks || []).map((task: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-3">{task.name}</td>
                      <td>{task.completed ? <Chip tone="ok">{t("taskDone")}</Chip> : <Chip tone="no">{t("taskPending")}</Chip>}</td>
                      <td>{task.completedAt || "—"}</td>
                      <td>{task.completedBy || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* LOCATION */}
      {tab === "location" && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <Card title={t("map")} accent="#662D91">
            {checkInScan?.latitude != null && checkInScan?.longitude != null ? (
              (() => {
                const lat = Number(checkInScan.latitude)
                const lng = Number(checkInScan.longitude)
                return (
                  <>
                    <LocationMap lat={lat} lng={lng} className="w-full h-72 rounded-xl border border-border overflow-hidden bg-muted" />
                    <a
                      href={`https://www.google.com/maps?q=${lat},${lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#662D91] dark:text-purple-300 hover:underline mt-2 inline-block"
                    >
                      {t("viewGoogleMaps")}
                    </a>
                  </>
                )
              })()
            ) : (
              <div className="h-72 rounded-xl border border-border relative overflow-hidden grid place-items-center" style={{ background: "linear-gradient(135deg,#ece7f5,#f6f2fb)" }}>
                {d.locationUnavailable ? (
                  <div className="text-center px-6 max-w-xs">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 rounded-full px-3 py-1 mb-2">{t("locUnavailableBadge")}</div>
                    <div className="text-sm text-muted-foreground">{t("locUnavailableDesc")}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center px-6">{t("noLocation")}</div>
                )}
              </div>
            )}
          </Card>
          <Card title={t("locationVerification")} accent="#C2740B">
            {d.selfieUrl && (
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-1.5">{t("identitySelfie")}</div>
                <a href={d.selfieUrl} target="_blank" rel="noopener noreferrer">
                  <img src={d.selfieUrl} alt={t("identitySelfie")} className="w-28 h-36 object-cover rounded-xl border border-border" />
                </a>
              </div>
            )}
            <KV k={t("workCentre")}>{d.workCenter || "—"}</KV>
            <KV k={t("checkInGps")}>{checkInScan?.latitude != null ? `${Number(checkInScan.latitude).toFixed(4)}, ${Number(checkInScan.longitude).toFixed(4)}` : "—"}</KV>
            <KV k={t("address")}>{parseAddress(checkInScan?.location) || "—"}</KV>
            <KV k={t("ipAddress")}>{checkInScan?.ipAddress || "—"}</KV>
            <KV k={t("checkInMethod")}><Meth m={d.checkInMethod} /></KV>
            <KV k={t("location")}>{d.locationUnavailable ? <Chip tone="warn">{t("locUnavailableChip")}</Chip> : (checkInScan?.latitude != null ? <Chip tone="ok">{t("locRecorded")}</Chip> : <Chip tone="grey">—</Chip>)}</KV>
            <KV k={t("deviceBiometric")}>{d.webauthnVerified ? <Chip tone="ok">{t("verified")}</Chip> : <Chip tone="grey">—</Chip>}</KV>
            <KV k={t("deviceTimezone")}>Europe/Madrid</KV>
          </Card>
        </div>
      )}

      {/* SURVEY */}
      {tab === "survey" && (
        <div className="w-full grid lg:grid-cols-2 gap-4 items-start">
          <SurveyStatusCard title={t("surveyWorker")} entry={survey?.worker || null} onFill={(e) => setSurveyDialog({ entry: e, title: t("surveyWorker") })} />
          <SurveyStatusCard title={t("surveyClient")} entry={survey?.customer || null} onFill={(e) => setSurveyDialog({ entry: e, title: t("surveyClientShort") })} />
        </div>
      )}

      {/* AUDIT */}
      {tab === "audit" && (
        <div className="w-full space-y-4">
          <Card title={t("traceability")} accent="#4F46E5">
            <KV k={t("recordOrigin")}>{d.source === "MANUAL" ? t("manualEntryFull") : t("realScanFull")}</KV>
            <KV k={t("created")}>{fmtDate(d.createdAt)}</KV>
            <KV k={t("lastModified")}>{fmtDate(d.updatedAt)}</KV>
            <KV k={t("corrections")}>{corrected ? <Chip tone="late">{t("editedAfter")}</Chip> : t("noneOriginal")}</KV>
          </Card>

          {/* Compliance — tamper-evident integrity seal */}
          {d.integrityHash && (
            <Card title={t("integritySeal")} accent="#059669">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{t("integrityDesc")}</div>
                  <code className="block mt-2 text-[11px] break-all bg-muted rounded-lg px-3 py-2 font-mono">{d.integrityHash}</code>
                </div>
              </div>
            </Card>
          )}

          {/* Compliance — correction audit trail */}
          <Card title={t("correctionHistory")} accent="#C2740B">
            {(d.correctionHistory || []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">{t("noCorrectionOriginal")}</div>
            ) : (
              <div className="space-y-3">
                {(d.correctionHistory || []).map((c: any, i: number) => (
                  <div key={i} className="border border-border rounded-xl p-3 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <Chip tone={c.status === "APPROVED" ? "ok" : c.status === "REJECTED" ? "no" : c.status === "PENDING" ? "late" : "grey"}>{c.status}</Chip>
                      <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)} · {c.requestedByRole}</span>
                    </div>
                    {(c.originalCheckIn || c.requestedCheckIn) && (
                      <div className="text-xs text-muted-foreground">{t("corrEntrada")}<b className="text-foreground">{c.originalCheckIn || "—"}</b> → <b className="text-foreground">{c.requestedCheckIn || "—"}</b></div>
                    )}
                    {(c.originalCheckOut || c.requestedCheckOut) && (
                      <div className="text-xs text-muted-foreground">{t("corrSalida")}<b className="text-foreground">{c.originalCheckOut || "—"}</b> → <b className="text-foreground">{c.requestedCheckOut || "—"}</b></div>
                    )}
                    {c.reason && <div className="text-xs mt-1"><span className="text-muted-foreground">{t("corrReason")}</span>{c.reason}</div>}
                    {c.reviewerNotes && <div className="text-xs"><span className="text-muted-foreground">{t("corrReview")}</span>{c.reviewerNotes}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportPdf} className="rounded-xl px-4 py-2.5 text-[12.5px] font-bold bg-[#662D91] text-white inline-flex items-center gap-1.5 hover:bg-[#57267c] transition-colors"><Download className="w-4 h-4" /> {t("exportPdf")}</button>
            <button onClick={() => setCorrectionOpen(true)} className="rounded-xl px-4 py-2.5 text-[12.5px] font-bold bg-muted text-foreground inline-flex items-center gap-1.5 hover:bg-muted/70 transition-colors"><PencilLine className="w-4 h-4" /> {t("requestCorrection")}</button>
          </div>
        </div>
      )}

      <SurveyFillDialog
        open={!!surveyDialog}
        entry={surveyDialog?.entry || null}
        date={d.date}
        title={surveyDialog?.title || t("surveyDefault")}
        token={session?.accessToken || ""}
        onClose={() => setSurveyDialog(null)}
        onSubmitted={() => { setSurveyDialog(null); loadSurvey() }}
      />

      <ManualAttendanceRequestForm
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        job={{ publicId: d.job?.publicId, jobName: d.job?.name }}
        preSelectedDate={d.date}
        preSelectedType={"EDIT_EXISTING" as any}
        existingWorkSessionId={recordId}
        mode="request"
        onSuccess={() => setCorrectionOpen(false)}
      />
    </div>
  )
}
