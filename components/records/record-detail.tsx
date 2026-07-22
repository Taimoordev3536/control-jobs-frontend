"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { AnimatedLoader } from "@/components/animated-loader"
import { ArrowLeft, Clock, Coffee, ListChecks, MapPin, ClipboardList, ShieldCheck, LayoutGrid, LogIn, LogOut, Download, PencilLine, Calendar, ChevronDown } from "lucide-react"
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

/**
 * Check-in and check-out are the facts; breaks are supporting detail. A flat
 * chronological list pushed check-out below the fold on any day with a few
 * breaks, so the break run is folded into one row that expands on demand —
 * the timeline stays three rows whether there are two events or thirty.
 */
function ScanTimeline({ scans, t }: { scans: any[]; t: (k: string) => string }) {
  const [openBreaks, setOpenBreaks] = useState(false)

  const isBreak = (s: any) => s.scanType === "break-start" || s.scanType === "break-end"
  const leading = scans.filter((s) => !isBreak(s) && s.scanType === "check-in")
  const trailing = scans.filter((s) => !isBreak(s) && s.scanType !== "check-in")
  const breaks = scans.filter(isBreak)

  // Pair starts with ends to total the time away.
  const breakMinutes = (() => {
    let total = 0
    let start: any = null
    for (const s of scans) {
      if (s.scanType === "break-start") start = s
      else if (s.scanType === "break-end" && start) {
        const a = toMinutes(start.time)
        const b = toMinutes(s.time)
        if (a != null && b != null && b >= a) total += b - a
        start = null
      }
    }
    return total
  })()
  const breakCount = scans.filter((s) => s.scanType === "break-start").length

  const Row = ({ s }: { s: any }) => {
    const isIn = s.scanType === "check-in"
    const isOut = s.scanType === "check-out"
    const dot = isIn ? "bg-emerald-500" : isOut ? "bg-red-500" : "bg-amber-500"
    const label = isIn
      ? t("checkIn")
      : isOut
        ? t("checkOut")
        : s.scanType === "break-start"
          ? t("breakStart")
          : s.scanType === "break-end"
            ? t("breakEnd")
            : s.scanType
    const addr = parseAddress(s.location)
    const anchor = isIn || isOut
    return (
      <div className="relative py-3">
        <div className={`absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full ring-4 ring-card ${dot}`} />
        <div className={`tabular-nums ${anchor ? "text-[15px] font-extrabold" : "text-[13px] font-semibold text-muted-foreground"}`}>
          {s.time} · {label}
        </div>
        <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
          {s.workCenter && <span>{s.workCenter}</span>}
          {s.method && <Meth m={s.method} />}
          {s.latitude != null && (
            <span>· GPS {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</span>
          )}
          {/* IP is evidence on the anchors; on every break row it is just noise.
              It remains on each event in the Audit tab. */}
          {anchor && s.ipAddress && <span>· IP {s.ipAddress}</span>}
          {addr && <span>· {addr}</span>}
          {s.notes && <span>· {translateNote(s.notes, t)}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative pl-7">
      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />

      {leading.map((s, i) => <Row key={`in-${i}`} s={s} />)}

      {breaks.length > 0 && (
        <div className="relative py-3">
          <div className="absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full ring-4 ring-card bg-amber-500" />
          {/* Plain row, as the other timeline entries — only the chevron carries
              a filled background, so the row still reads as a control. */}
          <button
            type="button"
            onClick={() => setOpenBreaks((v) => !v)}
            aria-expanded={openBreaks}
            className="flex items-center gap-2 text-[15px] font-extrabold hover:opacity-80 transition-opacity"
          >
            <Coffee className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              {breakCount} {breakCount === 1 ? t("breakSingular") : t("breakPlural")}
              {breakMinutes > 0 && ` · ${formatMinutes(breakMinutes)}`}
            </span>
            <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-amber-500 text-white shadow-sm">
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${openBreaks ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {openBreaks && (
            <div className="mt-2 border-l border-border pl-4 ml-1">
              {breaks.map((s, i) => <Row key={`br-${i}`} s={s} />)}
            </div>
          )}
        </div>
      )}

      {trailing.map((s, i) => <Row key={`out-${i}`} s={s} />)}
    </div>
  )
}

/**
 * System-written scan notes are stored in canonical English so the record stays
 * language-neutral; they are translated here, at read time, for whoever is
 * looking. Anything unrecognised is a human-typed note and passes through
 * untouched.
 */
function translateNote(raw: string | null | undefined, t: (k: string) => string): string | null {
  if (!raw) return null
  const msg = raw.trim().toLowerCase()

  if (msg === "work session completed") return t("noteSessionCompleted")
  if (msg === "qr check-in") return t("noteQrCheckIn")
  if (msg === "break ended, back to work") return t("noteBreakEnded")

  const started = /^break started:\s*(.*)$/i.exec(raw.trim())
  if (started) {
    const kind = started[1]?.trim()
    return kind ? `${t("noteBreakStarted")}: ${kind}` : t("noteBreakStarted")
  }

  return raw
}

/** "13:25" → minutes since midnight. */
function toMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
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
    // flex-wrap lets a long value (a full address, a worker name) drop onto its
    // own line instead of crushing the label into one character per row.
    <div className="flex flex-wrap justify-between items-start gap-x-3 gap-y-0.5 py-2.5 border-b border-border/70 last:border-0 text-sm">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="font-semibold min-w-0 break-words text-left sm:text-right">{children}</span>
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
  const { session, isAuthenticated } = useAuth() as any
  const { t } = useTranslation("record-detail")
  const [tab, setTab] = useState("summary")
  const [survey, setSurvey] = useState<SurveyStatus | null>(null)
  const [surveyDialog, setSurveyDialog] = useState<{ entry: SurveyEntry; title: string } | null>(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)

  const { data: d = null, isLoading: loading } = useQuery<any>({
    queryKey: ["records", "detail", recordId],
    queryFn: async () => (await apiFetch<any>(`/jobs/record/${recordId}`))?.data ?? null,
    enabled: isAuthenticated && !!recordId,
  })

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
  // Role-scoped survey visibility: worker sees only the worker survey, client only the
  // customer survey, employer sees both. Derived from the record route (backHref).
  const viewerRole = backHref.includes("/employer") ? "employer" : backHref.includes("/client") ? "client" : "worker"
  const showWorkerSurvey = viewerRole !== "client"
  const showCustomerSurvey = viewerRole !== "worker"

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
            // A bare "—" read as missing data. A flexible job has no planned
            // hours by design, and without them overtime cannot be computed —
            // so name the reason instead of leaving a blank.
            { v: h.hasSchedule ? fmtMin(h.scheduledMinutes) : t("flexibleShort"), l: t("scheduled"), soft: !h.hasSchedule },
            { v: fmtMin(h.workedMinutes), l: t("actual") },
            { v: !h.hasSchedule ? t("notApplicable") : h.overtimeMinutes ? fmtMin(h.overtimeMinutes) : "0h", l: t("overtime"), warn: h.hasSchedule && h.overtimeMinutes > 0, soft: !h.hasSchedule },
          ].map((x: any, i: number) => (
            // Five cells in a 2-column grid leave the last one orphaned next to
            // an empty cell; let it span the row on phones.
            <div key={i} className="p-4 text-center last:col-span-2 sm:last:col-span-1">
              <div className={`font-extrabold tabular-nums ${x.soft ? "text-[15px] text-muted-foreground" : "text-[19px]"} ${x.warn ? "text-amber-600 dark:text-amber-400" : x.soft ? "" : "text-foreground"}`}>{x.v}</div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-bold mt-1">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs — system canonical style. Sticky under the app header (50px) so
          switching tabs never requires scrolling back up on a long record. */}
      <div className="sticky top-[50px] z-20 bg-background border-b border-border mb-5">
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
              const items = [showWorkerSurvey ? survey?.worker : null, showCustomerSurvey ? survey?.customer : null].filter(Boolean) as any[]
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
              <ScanTimeline scans={d.scans || []} t={t} />
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
              // A table stretched one break across the full page width, leaving the
              // values stranded from their headers. A short list reads better and
              // matches the timeline on the Check-ins tab.
              <div className="max-w-2xl space-y-2">
                {(d.breaks || []).map((b: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40"
                  >
                    <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/40">
                      <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold tabular-nums">
                        {b.start} <span className="text-muted-foreground font-normal">→</span> {b.end}
                      </div>
                      {b.notes && (
                        <div className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {translateNote(b.notes, t)}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[13px] font-bold tabular-nums">
                      {b.durationMinutes} {t("min")}
                    </span>
                  </div>
                ))}

                {/* The label stays next to its value. Splitting them left/right
                    with other text between made the total read as the answer to
                    "deducted from worked hours". */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pt-3 mt-1 border-t border-border">
                  <span className="text-[13px] text-muted-foreground">
                    {t("deducted")}: {t("yes")}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">{t("totalBreaks")}</span>
                    <span className="text-[15px] font-extrabold tabular-nums">{fmtMin(h.breakMinutes)}</span>
                  </span>
                </div>
              </div>
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
              // Four columns in ~350px forced the name, the chip and the worker
              // to wrap into each other. One card per task instead: the status
              // chip gets its own line, and who/when sit under the name.
              <div className="max-w-2xl space-y-2">
                {(d.tasks || []).map((task: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/40"
                  >
                    <span className="mt-0.5 shrink-0">
                      {task.completed ? (
                        <ListChecks className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ListChecks className="w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold break-words">{task.name}</div>
                      {(task.completedAt || task.completedBy) && (
                        <div className="text-[12px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5">
                          {task.completedAt && <span className="tabular-nums">{task.completedAt}</span>}
                          {task.completedAt && task.completedBy && <span>·</span>}
                          {task.completedBy && <span className="break-words">{task.completedBy}</span>}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0">
                      {task.completed ? (
                        <Chip tone="ok">{t("taskDone")}</Chip>
                      ) : (
                        <Chip tone="no">{t("taskPending")}</Chip>
                      )}
                    </span>
                  </div>
                ))}
              </div>
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
            {/* The work center's registered address. A street address captured
                from the device is shown separately, and only when one exists —
                conflating the two made a name appear under "Address". */}
            <KV k={t("workCentreAddress")}>{d.workCenterAddress || "—"}</KV>
            {parseAddress(checkInScan?.location) && (
              <KV k={t("capturedAddress")}>{parseAddress(checkInScan?.location)}</KV>
            )}
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
          {showWorkerSurvey && <SurveyStatusCard title={t("surveyWorker")} entry={survey?.worker || null} onFill={(e) => setSurveyDialog({ entry: e, title: t("surveyWorker") })} />}
          {showCustomerSurvey && <SurveyStatusCard title={t("surveyClient")} entry={survey?.customer || null} onFill={(e) => setSurveyDialog({ entry: e, title: t("surveyClientShort") })} />}
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
