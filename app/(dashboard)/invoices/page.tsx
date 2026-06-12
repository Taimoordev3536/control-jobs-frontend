"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, Plus, Printer, Landmark } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddInvoicesModal from "@/components/add-invoices-modal"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { AnimatedLoader } from "@/components/animated-loader"
import { apiFetch, apiFetchRaw } from "@/lib/api"

interface InvoiceRow {
  id: number
  publicId: string
  invoiceNumber: string
  employerId: number
  issueDate: string
  periodStart: string
  periodEnd: string
  total: number
  status: string
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`

// Backend ISO ("2026-04-28") → dd/mm/aaaa for the list-page Date column.
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

export default function InvoicesPage() {
  const router = useRouter()
  const { t, tEnum } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [employerNames, setEmployerNames] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Employer-role users only ever see their own invoices, so the employer
  // column is redundant — hide it.
  const showEmployerColumn = !hasRole("employer")
  const canCreate = hasRole("admin")

  useEffect(() => {
    const fetchAll = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const json = await apiFetch<{ data: any[] }>("/invoices?pageSize=100")
        const list: InvoiceRow[] = (json.data || []).map((i: any) => ({
          id: i.id,
          publicId: i.publicId,
          invoiceNumber: i.invoiceNumber,
          employerId: i.employerId,
          issueDate: i.issueDate,
          periodStart: i.periodStart,
          periodEnd: i.periodEnd,
          total: Number(i.total) || 0,
          status: i.status,
        }))
        setInvoices(list)

        if (showEmployerColumn && list.length > 0) {
          try {
            const eJson = await apiFetch<{ data: any[] }>("/employers")
            const map: Record<number, string> = {}
            for (const e of eJson.data || []) {
              map[e.id] = e.name
            }
            setEmployerNames(map)
          } catch {
            /* fall back to id */
          }
        }
      } catch (e: any) {
        setInvoices([])
        toast({ title: e.message || "Error", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }
    fetchAll()
  }, [session?.accessToken, showEmployerColumn, refreshKey])

  const rows = useMemo(
    () =>
      invoices.map((inv) => ({
        id: inv.id,
        publicId: inv.publicId,
        date: fmtDate(inv.issueDate),
        invoiceNo: inv.invoiceNumber,
        employer: employerNames[inv.employerId] || `#${inv.employerId}`,
        total: fmt(inv.total),
        status: inv.status,
      })),
    [invoices, employerNames],
  )

  const baseColumns: any[] = [
    { key: "date", label: t("date"), sortable: true, align: "center" as const, width: "120px" },
    { key: "invoiceNo", label: t("invoiceNo"), sortable: true, align: "center" as const, width: "180px" },
  ]
  if (showEmployerColumn) {
    baseColumns.push({ key: "employer", label: t("employer"), sortable: true, align: "center" as const, width: "320px" })
  }
  const columns = [
    ...baseColumns,
    { key: "total", label: t("total"), sortable: true, align: "center" as const, width: "120px" },
    {
      key: "status",
      label: t("status") || "Status",
      sortable: true,
      align: "center" as const,
      width: "130px",
      render: (value: string) => {
        const color =
          value === "PAID"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : value === "PENDING"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : value === "OVERDUE"
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                : "bg-muted text-muted-foreground"
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {tEnum("invoiceStatus", value) || value}
          </span>
        )
      },
    },
  ]

  const actionButtons = [
    ...(canCreate
      ? [{ icon: Plus, onClick: () => setAddOpen(true), title: t("add") || "Add", type: "add" as any }]
      : []),
    { icon: Filter, onClick: () => {}, title: t("filter"), type: "filter" as any },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(rows, columns, "invoices.xlsx"),
      title: t("exportExcel") || "Export Excel",
      type: "excel" as any,
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(rows, columns, "invoices.csv"),
      title: t("exportCsv") || "Export CSV",
      type: "csv" as any,
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(rows, columns, "invoices.pdf"),
      title: t("exportPdf") || "Export PDF",
      type: "pdf" as any,
    },
  ]

  const handleRowClick = (row: any) => {
    router.push(`/invoices/${row.publicId}`)
  }

  const downloadBulkPdf = async (path: string, filename: string, invoiceRows: any[]) => {
    if (invoiceRows.length === 0) {
      toast({ title: t("selectAtLeastOneInvoice") || "Select at least one invoice", variant: "destructive" })
      return
    }
    try {
      const res = await apiFetchRaw(path, {
        method: "POST",
        body: { publicIds: invoiceRows.map((r) => r.publicId) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const selectionColumns = [
    {
      key: "print",
      icon: Printer,
      title: t("printSelected") || "Print selected",
      onAction: (sel: any[]) => downloadBulkPdf("/invoices/bulk-pdf", "invoices.pdf", sel),
    },
    {
      key: "receipts",
      icon: Landmark,
      title: t("issueReceipts") || "Issue receipts",
      onAction: (sel: any[]) => downloadBulkPdf("/invoices/bulk-receipts", "receipts.pdf", sel),
    },
  ]

  return (
    <>
      <DataListTemplate
        title={t("listOfInvoices")}
        data={rows}
        columns={columns}
        actionButtons={actionButtons}
        isLoading={isLoading}
        emptyMessage={
          isLoading ? <AnimatedLoader size={32} /> : t("noInvoicesAvailable")
        }
        onRowClick={handleRowClick}
        getRowId={(r) => r.publicId}
        selectionColumns={selectionColumns}
      />
      {canCreate && (
        <AddInvoicesModal
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  )
}
