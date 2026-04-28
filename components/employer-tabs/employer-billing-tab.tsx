"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
}

interface Props {
  employerId: string
}

const fmt = (n: number) =>
  `${n.toFixed(2).replace(".", ",")} €`

interface InvoiceHistoryRow {
  id: number
  publicId: string
  invoiceNumber: string
  issueDate: string
  total: number | string
  status: string
}

export default function EmployerBillingTab({ employerId }: Props) {
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
      const [previewRes, historyRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/billing/preview`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ employerId }),
        }),
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices?employerId=${encodeURIComponent(employerId)}&pageSize=12`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      ])
      if (!previewRes.ok) throw new Error("Failed to load billing preview")
      const previewJson = await previewRes.json()
      setPreview(previewJson.data)

      if (historyRes.ok) {
        const historyJson = await historyRes.json()
        setHistory(historyJson.data || [])
      } else {
        setHistory([])
      }
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
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading") || "Loading..."}
      </div>
    )
  }

  if (error || !preview) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error || t("noData") || "No data"}</p>
        <Button variant="outline" size="sm" onClick={fetchPreview} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-1" /> {t("retry") || "Retry"}
        </Button>
      </div>
    )
  }

  const statusKey = preview.billingStatus
  const statusBadgeColor =
    statusKey === "ACTIVE"
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : statusKey === "TRIAL"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : "bg-muted text-muted-foreground"

  return (
    <div className="p-4 space-y-4 max-w-4xl">
      {/* Section A — current rates snapshot */}
      <section className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("currentRates")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t("fixedFee")}</div>
            <div className="font-medium text-foreground">{fmt(preview.rates.monthlyFixed)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("perWorkCenter")}</div>
            <div className="font-medium text-foreground">{fmt(preview.rates.perWorkCenter)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("perWorker")}</div>
            <div className="font-medium text-foreground">{fmt(preview.rates.perWorker)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("discount")}</div>
            <div className="font-medium text-foreground">{preview.discountPct}%</div>
          </div>
        </div>
      </section>

      {/* Section B — billing status */}
      <section className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("billingStatus")}</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadgeColor}`}>
            {tEnum("billingStatus", statusKey) || statusKey}
          </span>
          {preview.trialEndsAt && (
            <span className="text-muted-foreground">
              {t("trialEndsOn")}: <span className="text-foreground font-medium">{preview.trialEndsAt}</span>
            </span>
          )}
        </div>
      </section>

      {/* Section C — current month live calculation */}
      <section className="rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t("currentMonthCalculation")}</h3>
          <Button variant="ghost" size="sm" onClick={fetchPreview} className="h-7 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" /> {t("refresh") || "Refresh"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground mb-3">
          {t("period")}: {preview.periodStart} → {preview.periodEnd}
          {preview.isProrated && (
            <span className="ml-2 text-amber-600">
              ({t("prorated")} — {preview.proratedDays}/{preview.daysInMonth} {t("days")})
            </span>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <Row label={t("fixedFee")} value={fmt(preview.breakdown.fixedAmount)} />
          <Row
            label={`${preview.workCenterCount} × ${fmt(preview.rates.perWorkCenter)} (${t("workCenters")})`}
            value={fmt(preview.breakdown.workcenterAmount)}
          />
          <Row
            label={`${preview.workerCount} × ${fmt(preview.rates.perWorker)} (${t("employees")})`}
            value={fmt(preview.breakdown.workerAmount)}
          />
          <div className="border-t border-border my-2" />
          <Row label={t("subtotal")} value={fmt(preview.breakdown.subtotal)} bold />
          <Row
            label={`${t("discount")} (${preview.discountPct}%)`}
            value={`−${fmt(preview.breakdown.discountAmount)}`}
            danger
          />
          <Row label={t("subtotalWithDiscount") || t("subtotal")} value={fmt(preview.breakdown.discountedSubtotal)} />
          <Row label={`${t("vat") || "IVA"} (${preview.vatPct}%)`} value={fmt(preview.breakdown.vatAmount)} />
          <div className="border-t-2 border-foreground/30 my-2" />
          <Row label={t("estimatedTotal")} value={fmt(preview.breakdown.total)} bold large />
        </div>
      </section>

      {/* Section D — invoice history */}
      <section className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("invoiceHistory")}</h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noInvoicesAvailable")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">{t("invoiceNo")}</th>
                <th className="text-left py-2">{t("date")}</th>
                <th className="text-right py-2">{t("total")}</th>
                <th className="text-center py-2">{t("status") || "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((inv) => {
                const color =
                  inv.status === "PAID"
                    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                    : inv.status === "PENDING"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : inv.status === "OVERDUE"
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => router.push(`/invoices/${inv.publicId}`)}
                  >
                    <td className="py-2 font-medium text-foreground">{inv.invoiceNumber}</td>
                    <td className="py-2 text-muted-foreground">{inv.issueDate}</td>
                    <td className="py-2 text-right text-foreground">{fmt(Number(inv.total) || 0)}</td>
                    <td className="py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                        {tEnum("invoiceStatus", inv.status) || inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  large,
  danger,
}: {
  label: string
  value: string
  bold?: boolean
  large?: boolean
  danger?: boolean
}) {
  return (
    <div
      className={`flex justify-between ${large ? "text-base" : "text-sm"} ${
        bold ? "font-semibold text-foreground" : "text-foreground/90"
      } ${danger ? "text-amber-700 dark:text-amber-400" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
