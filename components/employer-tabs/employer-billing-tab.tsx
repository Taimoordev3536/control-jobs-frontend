"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import {
  RefreshCw,
  Tag,
  Activity,
  Calculator,
  Calendar,
  Building2,
  Users,
  Percent,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import DataListTemplate, {
  CsvIcon,
  ExcelIcon,
  PdfIcon,
} from "@/components/ui/data-list-template"
import { Filter } from "lucide-react"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"

interface BillingPreview {
  employerId: number
  periodStart: string
  periodEnd: string
  isProrated: boolean
  proratedDays?: number
  daysInMonth?: number
  workCenterCount: number
  workerCount: number
  rates: {
    monthlyFixed: number
    perWorkCenter: number
    perWorker: number
  }
  discountPct: number
  vatPct: number
  breakdown: {
    fixedAmount: number
    workcenterAmount: number
    workerAmount: number
    subtotal: number
    discountPct: number
    discountAmount: number
    discountedSubtotal: number
    vatPct: number
    vatAmount: number
    total: number
    isProrated: boolean
    prorationFactor: number
  }
  billingStatus: string
  trialEndsAt: string | null
  pendingChange: {
    effectiveAt: string
    monthlyFixed: number
    perWorkCenter: number
    perWorker: number
  } | null
}

interface Props {
  employerId: string
  /** Optional slot rendered between the stat-card strip and the current-month calculation card. */
  slotAfterRateCards?: React.ReactNode
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`

// Convert backend ISO dates ("2026-05-31") to the dd/mm/yyyy display format
// the spec calls for. Returns the original string on parse failure so we
// degrade gracefully instead of swallowing the value.
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

interface InvoiceHistoryRow {
  id: number
  publicId: string
  invoiceNumber: string
  issueDate: string
  total: number | string
  status: string
}

export default function EmployerBillingTab({ employerId, slotAfterRateCards }: Props) {
  const { t, tEnum } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [history, setHistory] = useState<InvoiceHistoryRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreview = async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const [previewJson, historyJson] = await Promise.all([
        apiFetch<{ data: BillingPreview }>("/billing/preview", {
          method: "POST",
          body: { employerId },
        }),
        apiFetch<{ data: InvoiceHistoryRow[] }>(
          `/invoices?employerId=${encodeURIComponent(employerId)}&pageSize=12`,
        ).catch(() => ({ data: [] as InvoiceHistoryRow[] })),
      ])
      setPreview(previewJson.data)
      setHistory(historyJson.data || [])
    } catch (e: any) {
      setError(e.message || "Error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId, session?.accessToken])

  if (isLoading) {
    return <AnimatedLoader />
  }

  if (error || !preview) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error || t("noData") || "No data"}</p>
        <Button variant="outline" size="sm" onClick={() => fetchPreview()} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-1" /> {t("retry") || "Retry"}
        </Button>
      </div>
    )
  }

  const statusKey = preview.billingStatus

  // Five stat cards — uses the exact same markup/classes as the employer
  // dashboard's "Compact Stats Grid" (Total jobs / In progress / Scheduled /
  // Completed / Total clients). Uniform `bg-[#6B7280]` accent so every card
  // reads as a peer in the strip.
  const rateCards = [
    { label: t("fixedFee"), value: fmt(preview.rates.monthlyFixed), icon: Tag },
    { label: t("perWorkCenter"), value: fmt(preview.rates.perWorkCenter), icon: Building2 },
    { label: t("perWorker"), value: fmt(preview.rates.perWorker), icon: Users },
    { label: t("discount"), value: `${preview.discountPct}%`, icon: Percent },
    {
      label: t("billingStatus") || "Status",
      value: tEnum("billingStatus", statusKey) || statusKey,
      icon: Activity,
      footer:
        statusKey === "TRIAL" && preview.trialEndsAt
          ? `${t("trialEndsOn")}: ${fmtDate(preview.trialEndsAt)}`
          : undefined,
    },
  ]

  return (
    <div className="w-full">
      {preview.pendingChange && (
        <div className="mx-2 mt-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <div className="font-medium text-amber-900 dark:text-amber-200">
            {t("upcomingRateChange") || "Your tariff is changing"}
          </div>
          <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
            {t("upcomingRateChangeBody") || "From"}{" "}
            <strong>{fmtDate(preview.pendingChange.effectiveAt)}</strong>: {t("fixedFee")}{" "}
            <strong>{fmt(preview.pendingChange.monthlyFixed)}</strong>, {t("perWorkCenter")}{" "}
            <strong>{fmt(preview.pendingChange.perWorkCenter)}</strong>, {t("perWorker")}{" "}
            <strong>{fmt(preview.pendingChange.perWorker)}</strong>.
          </p>
        </div>
      )}

      {/* Compact Stats Grid — copy of employer-dashboard.tsx pattern.
          Wrapped in `p-2` to align with the calculation card and the
          DataListTemplate below (both also use a p-2 outer indent). */}
      <div className="p-2">
        <h3 className="text-sm font-semibold text-foreground mb-2 px-1">
          {t("currentRates") || "Current rates"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {rateCards.map((stat, index) => {
            // Long status strings ("Awaiting payment method", "Pendiente de
            // pago", etc.) overflow the card at text-lg. Switch to text-xs
            // and allow wrapping past 12 chars so the value reads cleanly
            // without breaking the visual rhythm of the rest of the strip.
            const valueStr = String(stat.value ?? '')
            const isLong = valueStr.length > 12
            return (
              <Card
                key={index}
                className="border border-border hover:shadow-md transition-all duration-300 hover:scale-105 group bg-card"
              >
                <CardContent className="p-3">
                  <div className="w-full h-0.5 bg-[#6B7280] rounded-full mb-2"></div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-[#6B7280] group-hover:scale-110 transition-transform duration-300 shrink-0">
                      <stat.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-right min-w-0 flex-1">
                      <div
                        className={`font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300 ${
                          isLong
                            ? "text-xs leading-tight break-words"
                            : "text-lg"
                        }`}
                        title={isLong ? valueStr : undefined}
                      >
                        {stat.value}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
                    {stat.label}
                  </div>
                  {stat.footer && (
                    <div className="mt-1 text-[10px] text-muted-foreground truncate">
                      {stat.footer}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {slotAfterRateCards}

      {/* Current month calculation — compact. Wrapped in a `p-2` outer
          div so the visible card edges line up with DataListTemplate's
          inner card below (which has its own p-2 wrapper internally).
          No refresh button — the page already refetches on tab open. */}
      <div className="p-2">
        <div className="bg-card rounded-lg shadow-sm border border-border p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calculator className="h-4 w-4 text-[#6B21A8] shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("currentMonthCalculation") || "Current month calculation"}
            </h3>
            {(() => {
              // Per spec §8: always show calendar days in parentheses,
              // regardless of whether the period is prorated. Falls back to
              // computing from periodStart/periodEnd when the API doesn't
              // pass `proratedDays` (i.e. full-month invoices).
              const totalDays =
                preview.proratedDays ??
                (() => {
                  const s = new Date(preview.periodStart)
                  const e = new Date(preview.periodEnd)
                  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
                })()
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-purple-50 dark:bg-purple-950/40 text-[#6B21A8] font-medium">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(preview.periodStart)} - {fmtDate(preview.periodEnd)}
                  <span className="ml-1 opacity-80">
                    ({totalDays} {t("days")})
                  </span>
                </span>
              )
            })()}
          </div>

          {/* Breakdown rows */}
          <div className="mt-2 rounded border border-border overflow-hidden">
            <Row label={t("fixedFee")} value={fmt(preview.breakdown.fixedAmount)} />
            <Row
              label={`${preview.workCenterCount} × ${fmt(preview.rates.perWorkCenter)} (${t("workCenters")})`}
              value={fmt(preview.breakdown.workcenterAmount)}
            />
            <Row
              label={`${preview.workerCount} × ${fmt(preview.rates.perWorker)} (${t("employees")})`}
              value={fmt(preview.breakdown.workerAmount)}
              divider
            />
            <Row label={t("subtotal")} value={fmt(preview.breakdown.subtotal)} bold />
            <Row
              label={`${t("discount")} (${preview.discountPct}%)`}
              value={`−${fmt(preview.breakdown.discountAmount)}`}
              danger
              divider
            />
            {/* Spacer row (per spec: blank line below the discount). */}
            <div className="h-3 bg-background" />
            <Row
              label={t("subtotalWithDiscount") || t("subtotal")}
              value={fmt(preview.breakdown.discountedSubtotal)}
              bold
            />
            <Row
              label={`${t("vat") || "IVA"} (${preview.vatPct}%)`}
              value={fmt(preview.breakdown.vatAmount)}
              divider
            />
          </div>

          {/* Estimated total — compact highlight bar */}
          <div className="mt-2 flex items-center justify-between rounded bg-[#6B21A8] text-white px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t("estimatedTotal") || "Estimated total"}
            </span>
            <span className="text-sm font-bold tabular-nums">
              {fmt(preview.breakdown.total)}
            </span>
          </div>
        </div>
      </div>

      {(() => {
        // Export columns are flat — labels for the file headers, no React.
        const exportColumns = [
          { key: "invoiceNumber", label: t("invoiceNo") || "Invoice No." },
          { key: "issueDate", label: t("date") || "Date" },
          { key: "total", label: t("total") || "Total" },
          { key: "status", label: t("status") || "Status" },
        ]
        // Export rows: localize the status enum and pre-format currency so
        // the downloaded file reads the same as what's on screen.
        const exportRows = history.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          issueDate: fmtDate(inv.issueDate),
          total: fmt(Number(inv.total) || 0),
          status: tEnum("invoiceStatus", inv.status) || inv.status,
        }))
        const baseFileName = `invoices-${employerId}`

        return (
          <DataListTemplate
            title={t("invoiceHistory") || "Invoice history"}
            data={history}
            emptyMessage={t("noInvoicesAvailable") || "No invoices yet."}
            onRowClick={(row: any) => router.push(`/invoices/${row.publicId}`)}
            defaultSortColumn="issueDate"
            defaultSortDirection="desc"
            actionButtons={[
              {
                icon: Filter,
                onClick: () => {
                  // Template auto-toggles its filter row on type === "filter"
                },
                title: t("filter") || "Filter",
                type: "filter",
              },
              {
                icon: ExcelIcon,
                onClick: () => exportToXLSX(exportRows, exportColumns, `${baseFileName}.xls`),
                title: t("exportExcel") || "Export Excel",
                type: "excel",
              },
              {
                icon: CsvIcon,
                onClick: () => exportToCSV(exportRows, exportColumns, `${baseFileName}.csv`),
                title: t("exportCsv") || "Export CSV",
                type: "csv",
              },
              {
                icon: PdfIcon,
                onClick: () => exportToPDF(exportRows, exportColumns, `${baseFileName}.pdf`),
                title: t("exportPdf") || "Export PDF",
                type: "pdf",
              },
            ]}
            columns={[
              {
                key: "invoiceNumber",
                label: t("invoiceNo") || "Invoice No.",
                sortable: true,
              },
              {
                key: "issueDate",
                label: t("date") || "Date",
                sortable: true,
                render: (value: any) => fmtDate(value),
              },
              {
                key: "total",
                label: t("total") || "Total",
                sortable: true,
                align: "right",
                render: (value: any) => fmt(Number(value) || 0),
              },
              {
                key: "status",
                label: t("status") || "Status",
                sortable: true,
                align: "center",
                render: (value: any) => {
                  const color =
                    value === "PAID"
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                      : value === "PENDING"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : value === "OVERDUE"
                          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          : "bg-muted text-muted-foreground"
                  return (
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                      {tEnum("invoiceStatus", value) || value}
                    </span>
                  )
                },
              },
            ]}
          />
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

// SectionCard mirrors the card chrome used on /mydata: rounded-xl + soft
// shadow, a header band with a purple-tinted icon swatch, and a roomy body.
// Keeps the Billing tab visually consistent with the rest of the dashboard
// instead of looking like an older minimal-border layout.
function SectionCard({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border bg-muted/20 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-[#6B21A8] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  bold,
  danger,
  divider,
}: {
  label: string
  value: string
  bold?: boolean
  danger?: boolean
  divider?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-1 text-xs ${
        divider ? "border-b border-border" : ""
      } ${bold ? "bg-muted/30" : ""}`}
    >
      <span
        className={`${bold ? "font-semibold text-foreground" : "text-foreground/90"} ${
          danger ? "text-amber-700 dark:text-amber-400" : ""
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          bold ? "font-semibold text-foreground" : "text-foreground"
        } ${danger ? "text-amber-700 dark:text-amber-400" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
