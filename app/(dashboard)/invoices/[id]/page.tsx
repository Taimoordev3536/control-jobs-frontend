"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import PdfIconDefault from "@/icons/Controles/pdf1.svg"
import PdfIconHover from "@/icons/Controles/pdf2.svg"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { apiFetch, apiFetchRaw } from "@/lib/api"

interface InvoiceSnapshotRow {
  id?: number
  name: string
}

interface InvoiceDetail {
  id: number
  publicId: string
  invoiceNumber: string
  employerId: number
  periodStart: string
  periodEnd: string
  issueDate: string
  dueDate: string
  isProrated: boolean
  proratedDays: number | null
  daysInMonth: number | null
  monthlyFixedRate: number | string
  perWorkCenterRate: number | string
  perWorkerRate: number | string
  fixedAmount: number | string
  workcenterCount: number
  workcenterAmount: number | string
  workerCount: number
  workerAmount: number | string
  subtotal: number | string
  discountPct: number | string
  discountAmount: number | string
  vatPct: number | string
  vatAmount: number | string
  total: number | string
  status: string
  paidAt: string | null
  // "Page 2" snapshots — present when accessLevel is 'full'.
  workCenters?: InvoiceSnapshotRow[]
  workers?: InvoiceSnapshotRow[]
  // 'full' = page 1 + page 2 visible | 'page1Only' = page 2 hidden (Bronze).
  accessLevel?: 'full' | 'page1Only'
}

const fmt = (v: number | string) => {
  const n = typeof v === "string" ? parseFloat(v) : v
  return `${(n || 0).toFixed(2).replace(".", ",")} €`
}

// Backend ISO ("2026-04-28") → dd/mm/aaaa display. Invariant from spec §5;
// applied to issue date, due date, and the period range below.
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

export default function InvoiceDetailPage() {
  const { t, tEnum } = useTranslation()
  const router = useRouter()
  const { id: publicId } = useParams() as { id: string }
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  // Mark-paid + cancel are admin-only operations (accounting actions).
  // Partners and employers can view and download but not change status.
  const canManage = hasRole("admin")

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActing, setIsActing] = useState(false)
  const [employerName, setEmployerName] = useState<string | null>(null)
  const [pdfHovered, setPdfHovered] = useState(false)

  const fetchInvoice = async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const json = await apiFetch<{ data: InvoiceDetail }>(`/invoices/${publicId}`)
      setInvoice(json.data)
      try {
        const eJson = await apiFetch<{ data: any }>(`/employers/${json.data.employerId}`)
        if (eJson?.data?.name) setEmployerName(eJson.data.name)
      } catch {
        /* ignore */
      }
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoice()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId, session?.accessToken])

  const markPaid = async () => {
    if (!invoice || !session?.accessToken) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}/mark-paid`, { method: "POST" })
      toast({ title: t("markedAsPaid") || "Marked as paid", variant: "success" as any })
      fetchInvoice()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const cancelInvoice = async () => {
    if (!invoice || !session?.accessToken) return
    if (!confirm(t("confirmCancelInvoice") || "Cancel this invoice?")) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}/cancel`, { method: "POST" })
      toast({ title: t("invoiceCancelled") || "Invoice cancelled", variant: "success" as any })
      fetchInvoice()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const downloadPdf = async () => {
    if (!invoice || !session?.accessToken) return
    try {
      const res = await apiFetchRaw(`/invoices/${invoice.publicId}/pdf`)
      if (!res.ok) throw new Error("Failed to load PDF")
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, "_blank")
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <AnimatedLoader />
  }
  if (!invoice) {
    return (
      <div className="bg-background min-h-screen p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("noData") || "No data"}</p>
      </div>
    )
  }

  const statusColor =
    invoice.status === "PAID"
      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      : invoice.status === "PENDING"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        : invoice.status === "OVERDUE"
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : "bg-muted text-muted-foreground"

  return (
    <div className="bg-background min-h-screen w-full">
      {/* Page header — matches employer-detail / system pattern */}
      <div className="bg-card border-b border-border">
        <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
            {invoice.invoiceNumber}
          </h1>
          <span className="text-sm sm:text-base font-medium text-foreground text-center">
            {t("invoices")}
          </span>
          <div className="flex justify-end">
            <button
              onClick={() => router.back()}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-3 sm:px-4 py-2 border-t border-border">
          <button
            onClick={downloadPdf}
            title="PDF"
            onMouseEnter={() => setPdfHovered(true)}
            onMouseLeave={() => setPdfHovered(false)}
            className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
          >
            {pdfHovered ? (
              <PdfIconHover className="w-5 h-5" />
            ) : (
              <PdfIconDefault className="w-5 h-5" />
            )}
          </button>
          {canManage && invoice.status === "PENDING" && (
            <Button
              size="sm"
              onClick={markPaid}
              disabled={isActing}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t("markAsPaid") || "Mark as paid"}
            </Button>
          )}
          {canManage && invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <Button
              size="sm"
              variant="outline"
              onClick={cancelInvoice}
              disabled={isActing}
              className="h-8 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {t("cancel") || "Cancel"}
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* Top info row — invoice meta on left, bill-to on right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Invoice meta */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("invoiceNo")}</span>
                <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("status") || "Status"}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
                  {tEnum("invoiceStatus", invoice.status) || invoice.status}
                </span>
              </div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("issueDate") || "Issue date"}</span>
                <span className="text-foreground">{fmtDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("dueDate") || "Due date"}</span>
                <span className="text-foreground">{fmtDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("period")}</span>
                <span className="text-foreground">
                  {fmtDate(invoice.periodStart)} → {fmtDate(invoice.periodEnd)}
                  {invoice.isProrated && invoice.proratedDays != null && (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">
                      ({invoice.proratedDays} {t("days")})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              {t("billTo") || "Bill to"}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {employerName || `#${invoice.employerId}`}
            </div>
          </div>
        </div>

        {/* Line items table — system header style */}
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-foreground">
                  {t("description") || "Description"}
                </th>
                <th className="text-center px-3 py-2 font-semibold text-foreground w-24">
                  {t("quantity") || "Qty"}
                </th>
                <th className="text-right px-3 py-2 font-semibold text-foreground w-32">
                  {t("price") || "Price"}
                </th>
                <th className="text-right px-3 py-2 font-semibold text-foreground w-32">
                  {t("amount") || "Amount"}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-3 py-2 text-foreground">{t("fixedFee")}</td>
                <td className="text-center px-3 py-2 text-foreground">1</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.monthlyFixedRate)}</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.fixedAmount)}</td>
              </tr>
              <tr className="border-b border-border bg-muted/20">
                <td className="px-3 py-2 text-foreground">{t("workCenters")}</td>
                <td className="text-center px-3 py-2 text-foreground">{invoice.workcenterCount}</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.perWorkCenterRate)}</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.workcenterAmount)}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-3 py-2 text-foreground">{t("employees")}</td>
                <td className="text-center px-3 py-2 text-foreground">{invoice.workerCount}</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.perWorkerRate)}</td>
                <td className="text-right px-3 py-2 text-foreground">{fmt(invoice.workerAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals — compact right-aligned card */}
        <div className="flex justify-end">
          <div className="w-full sm:max-w-sm rounded-md border border-border bg-card p-4 space-y-1.5 text-xs">
            <Row label={t("subtotal")} value={fmt(invoice.subtotal)} />
            {Number(invoice.discountPct) > 0 && (
              <Row
                label={`${t("discount")} (${invoice.discountPct}%)`}
                value={`−${fmt(invoice.discountAmount)}`}
                danger
              />
            )}
            <Row
              label={`${t("vat") || "IVA"} (${invoice.vatPct}%)`}
              value={fmt(invoice.vatAmount)}
            />
            <div className="border-t-2 border-purple-600 my-2" />
            <Row label={t("total")} value={fmt(invoice.total)} bold large />
          </div>
        </div>

        {/* Page 2 — worksites + workers detail.
              accessLevel === 'page1Only' (Bronze partner): hide entirely
              and show a small muted notice instead. Affiliates never reach
              this page (backend 403). Other roles see the full lists. */}
        {invoice.accessLevel === "page1Only" ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            {t("invoiceDetailPage2Restricted") ||
              "Worksite and worker detail isn't available at your access level."}
          </div>
        ) : (
          ((invoice.workCenters?.length ?? 0) > 0 ||
            (invoice.workers?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Work centers */}
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                  {t("workCenters") || "Work centers"} (
                  {invoice.workCenters?.length ?? 0})
                </div>
                {invoice.workCenters && invoice.workCenters.length > 0 ? (
                  <ul className="space-y-1 text-xs text-foreground">
                    {invoice.workCenters.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{w.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>

              {/* Workers */}
              <div className="rounded-md border border-border bg-card p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                  {t("workers") || "Workers"} ({invoice.workers?.length ?? 0})
                </div>
                {invoice.workers && invoice.workers.length > 0 ? (
                  <ul className="space-y-1 text-xs text-foreground">
                    {invoice.workers.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{w.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          )
        )}
      </div>
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
      className={`flex justify-between ${large ? "text-sm" : "text-xs"} ${
        bold ? "font-semibold text-foreground" : "text-foreground/90"
      } ${danger ? "text-amber-700 dark:text-amber-400" : ""}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
