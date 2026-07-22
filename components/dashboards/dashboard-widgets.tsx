"use client"

import { ReactNode, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, ChevronDown, Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"

type Tone = "info" | "warn" | "crit" | "good" | "brand"

const TONE_BG: Record<Tone, string> = {
  info: "bg-indigo-500",
  warn: "bg-amber-500",
  crit: "bg-red-500",
  good: "bg-emerald-500",
  brand: "bg-[#662D91]",
}

/** Severity-colored attention tile (employer stat-card design + hover lift). */
export function AttentionCard({
  value,
  label,
  Icon,
  tone = "info",
  onClick,
}: {
  value: number
  label: string
  Icon: any
  tone?: Tone
  onClick?: () => void
}) {
  const c = TONE_BG[tone]
  return (
    <Card
      onClick={onClick}
      className="border border-border bg-card cursor-pointer rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-8px_rgba(70,40,110,.28)] dark:hover:shadow-[0_10px_26px_-8px_rgba(0,0,0,.6)] group"
    >
      <CardContent className="p-3.5">
        <div className={`w-full h-1 ${c} rounded-full mb-2.5 opacity-90`}></div>
        <div className="flex items-center justify-between mb-2.5">
          <div className={`p-2 rounded-xl ${c} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{value ?? 0}</div>
        </div>
        <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{label}</div>
      </CardContent>
    </Card>
  )
}

/** Analysis / KPI stat card (accent bar + colored icon + value + label). Non-interactive. */
export function StatCard({
  value,
  label,
  Icon,
  tone = "brand",
}: {
  value: ReactNode
  label: string
  Icon: any
  tone?: Tone
}) {
  const c = TONE_BG[tone]
  return (
    <Card className="border border-border bg-card rounded-2xl shadow-[0_1px_3px_rgba(30,20,40,.05)]">
      <CardContent className="p-3.5">
        <div className={`h-[3px] ${c} rounded-full mb-2.5 opacity-85`}></div>
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-xl ${c} shadow-sm`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
        </div>
        <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{label}</div>
      </CardContent>
    </Card>
  )
}

/** Raised, tactile "3D" action button (soft depth + lift on hover, press on active). */
export function ActionButton({
  label,
  Icon,
  onClick,
  primary = false,
  disabled = false,
  spinning = false,
  iconClassName = "h-4 w-4",
}: {
  label: string
  Icon?: any
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  spinning?: boolean
  iconClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 h-11 px-5 rounded-xl font-semibold text-sm transition-all duration-150 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#662D91] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        primary
          ? "bg-[#662D91] text-white shadow-[0_5px_16px_-3px_rgba(102,45,145,.55)] hover:-translate-y-0.5 hover:shadow-[0_9px_24px_-4px_rgba(102,45,145,.65)] active:shadow-[0_3px_9px_-3px_rgba(102,45,145,.55)]"
          : "bg-card text-foreground border border-border shadow-[0_3px_10px_-3px_rgba(30,20,40,.14)] hover:-translate-y-0.5 hover:text-[#662D91] hover:border-[#D9CFEA] hover:shadow-[0_7px_18px_-4px_rgba(30,20,40,.2)] active:shadow-[0_2px_7px_-3px_rgba(30,20,40,.14)] dark:shadow-black/30 dark:hover:shadow-black/50"
      }`}
    >
      {Icon && <Icon className={`${iconClassName} shrink-0 ${spinning ? "animate-spin" : ""}`} />}
      {label}
    </button>
  )
}

/** Section eyebrow label. */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</p>
      {right}
    </div>
  )
}

/** Card panel that holds a list, with an optional header action. */
export function ListPanel({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <Card className="border border-border bg-card overflow-hidden rounded-2xl shadow-[0_2px_10px_-4px_rgba(30,20,40,.1)] dark:shadow-black/20">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {onAction && (
          <button onClick={onAction} className="text-xs font-semibold text-[#662D91] dark:text-purple-300 hover:underline">
            {actionLabel}
          </button>
        )}
      </div>
      <div>{children}</div>
    </Card>
  )
}

/** Rounded avatar/icon tile for list rows. */
export function RowAvatar({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "muted" }) {
  const cls =
    tone === "brand"
      ? "bg-[#F2EAFA] dark:bg-purple-950/40 text-[#662D91] dark:text-purple-300"
      : "bg-muted text-foreground"
  return <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 font-bold text-sm ${cls}`}>{children}</div>
}

/** A single list row with avatar, title/subtitle, right content, hover chevron. */
export function ListRow({
  avatar,
  title,
  subtitle,
  right,
  onClick,
}: {
  avatar: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
        onClick ? "hover:bg-muted/50 cursor-pointer" : ""
      }`}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</div>}
      </div>
      {right}
      {onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
      )}
    </div>
  )
}

export function StatusChip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}>{children}</span>
}

/** Distinct work-center names present across a job list (for the filter dropdown). */
export function jobWorkCenters(jobs: any[]): string[] {
  const names = jobs.flatMap((j) => {
    if (Array.isArray(j?.workCenters) && j.workCenters.length) return j.workCenters.map((w: any) => w?.name).filter(Boolean)
    if (j?.workCenterNames) return String(j.workCenterNames).split(",").map((s: string) => s.trim())
    if (j?.workCenter?.name) return [j.workCenter.name]
    return []
  })
  return Array.from(new Set(names.filter(Boolean)))
}

/** Distinct client names present across a job list. */
export function jobClients(jobs: any[]): string[] {
  return Array.from(new Set(jobs.map((j) => j?.clientName || j?.client?.name).filter(Boolean)))
}

/** Distinct worker names present across a job list. */
export function jobWorkers(jobs: any[]): string[] {
  const names = jobs.flatMap((j) => {
    if (Array.isArray(j?.workers) && j.workers.length) return j.workers.map((w: any) => w?.name || w?.code).filter(Boolean)
    if (j?.worker?.name) return [j.worker.name]
    return []
  })
  return Array.from(new Set(names.filter(Boolean)))
}

/** Occupation of a job — uses job.occupation if set, else derives from task names. */
export function jobOccupation(job: any): string {
  if (job?.occupation) return String(job.occupation)
  const tasks = (job?.tasks || [])
    .map((t: any) => (typeof t === "string" ? t : t?.name || ""))
    .join(" ")
    .toLowerCase()
  if (/clean|limpie|sweep|barrer/.test(tasks)) return "Cleaning"
  if (/secur|guard|vigil/.test(tasks)) return "Security"
  if (/maint|repair|manten|reparar/.test(tasks)) return "Maintenance"
  if (/deliver|transp/.test(tasks)) return "Delivery"
  if (/garden|plant|jardin/.test(tasks)) return "Landscaping"
  if (/paint|pintar/.test(tasks)) return "Maintenance"
  return "General"
}

/** Distinct occupations present across a job list. */
export function jobOccupations(jobs: any[]): string[] {
  return Array.from(new Set(jobs.map((j) => jobOccupation(j)).filter(Boolean)))
}

/** True if a job matches the active search / status / work-center / occupation filters. */
export function jobMatchesFilters(
  job: any,
  f: { search: string; status: string; workCenter: string; occupation?: string; client?: string; worker?: string },
): boolean {
  const s = (f.search || "").toLowerCase()
  const name = String(job?.jobName || job?.title || "").toLowerCase()
  const clientName = String(job?.clientName || job?.client?.name || "")
  const workerNames = Array.isArray(job?.workers) && job.workers.length
    ? job.workers.map((w: any) => w?.name || w?.code).filter(Boolean)
    : job?.worker?.name
      ? [job.worker.name]
      : []
  const matchSearch =
    !s || name.includes(s) || clientName.toLowerCase().includes(s) || workerNames.some((w: string) => String(w).toLowerCase().includes(s))
  const matchStatus = f.status === "all" || job?.status === f.status
  const wcs = Array.isArray(job?.workCenters) && job.workCenters.length
    ? job.workCenters.map((w: any) => w?.name)
    : job?.workCenterNames
      ? String(job.workCenterNames).split(",").map((x: string) => x.trim())
      : job?.workCenter?.name
        ? [job.workCenter.name]
        : []
  const matchWc = f.workCenter === "all" || wcs.some((w: string) => (w || "") === f.workCenter)
  const matchOcc = !f.occupation || f.occupation === "all" || jobOccupation(job) === f.occupation
  const matchClient = !f.client || f.client === "all" || clientName === f.client
  const matchWorker = !f.worker || f.worker === "all" || workerNames.some((w: string) => (w || "") === f.worker)
  return matchSearch && matchStatus && matchWc && matchOcc && matchClient && matchWorker
}

/** Reusable slim job filter bar: search + status + (optional) occupation + work center. */
export function JobFilterBar({
  search,
  onSearch,
  status,
  onStatus,
  workCenter,
  onWorkCenter,
  workCenters,
  occupation,
  onOccupation,
  occupations,
  client,
  onClient,
  clients,
  worker,
  onWorker,
  workers,
}: {
  search: string
  onSearch: (v: string) => void
  status: string
  onStatus: (v: string) => void
  workCenter: string
  onWorkCenter: (v: string) => void
  workCenters: string[]
  occupation?: string
  onOccupation?: (v: string) => void
  occupations?: string[]
  client?: string
  onClient?: (v: string) => void
  clients?: string[]
  worker?: string
  onWorker?: (v: string) => void
  workers?: string[]
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // How many dropdowns are narrowing the list — drives the count on the mobile
  // "Filters" button so an active filter is visible while collapsed.
  const activeCount = [
    status && status !== "all",
    occupation && occupation !== "all",
    client && client !== "all",
    worker && worker !== "all",
    workCenter && workCenter !== "all",
  ].filter(Boolean).length

  // A fixed 150px left each dropdown stranded on its own row with dead space
  // beside it on a phone. Full width in a 2-column grid there; the original
  // inline row from sm upwards, where `contents` dissolves the grid wrapper.
  const dd = "h-9 w-full sm:w-[150px] bg-card border-border text-sm"
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input placeholder={t("searchJobs") || "Search jobs…"} value={search} onChange={(e) => onSearch(e.target.value)} className="pl-9 h-9 bg-card border-border" />
      </div>

      {/* The dropdowns are rarely touched, yet took five rows on every phone
          view. Collapse them behind a toggle on mobile; unchanged on desktop. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="sm:hidden flex items-center justify-between h-9 px-3 rounded-md border border-border bg-card text-sm"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {t("filters") || "Filtros"}
          {activeCount > 0 && (
            <span className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#662D91] text-white text-[11px] font-bold">{activeCount}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div className={`${open ? "grid" : "hidden"} grid-cols-2 gap-2 sm:grid sm:contents`}>
      <Select value={status} onValueChange={onStatus}>
        <SelectTrigger className={dd}><SelectValue placeholder={t("allStatuses") || "All statuses"} /></SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="all">{t("allStatuses") || "All statuses"}</SelectItem>
          <SelectItem value="in_progress">{t("inProgress") || "In progress"}</SelectItem>
          <SelectItem value="scheduled">{t("scheduled") || "Scheduled"}</SelectItem>
          <SelectItem value="completed">{t("completed") || "Completed"}</SelectItem>
        </SelectContent>
      </Select>
      {occupations && occupations.length > 0 && onOccupation && (
        <Select value={occupation || "all"} onValueChange={onOccupation}>
          <SelectTrigger className={dd}><SelectValue placeholder={t("allOccupations") || "All occupations"} /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{t("allOccupations") || "All occupations"}</SelectItem>
            {occupations.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {clients && clients.length > 0 && onClient && (
        <Select value={client || "all"} onValueChange={onClient}>
          <SelectTrigger className={dd}><SelectValue placeholder={t("allClients") || "All clients"} /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{t("allClients") || "All clients"}</SelectItem>
            {clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {workers && workers.length > 0 && onWorker && (
        <Select value={worker || "all"} onValueChange={onWorker}>
          <SelectTrigger className={dd}><SelectValue placeholder={t("allWorkers") || "All workers"} /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{t("allWorkers") || "All workers"}</SelectItem>
            {workers.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {workCenters.length > 0 && (
        <Select value={workCenter} onValueChange={onWorkCenter}>
          <SelectTrigger className={dd}><SelectValue placeholder={t("allWorkCenters") || "All work centers"} /></SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">{t("allWorkCenters") || "All work centers"}</SelectItem>
            {workCenters.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      </div>
    </div>
  )
}
