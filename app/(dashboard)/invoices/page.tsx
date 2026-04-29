"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { AnimatedLoader } from "@/components/animated-loader"

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

export default function InvoicesPage() {
  const router = useRouter()
  const { t, tEnum } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [employerNames, setEmployerNames] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Employer-role users only ever see their own invoices, so the employer
  // column is redundant — hide it.
  const showEmployerColumn = !hasRole("employer")

  useEffect(() => {
    const fetchAll = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices?pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        )
        if (!res.ok) {
          let msg = "Failed to load invoices"
          try {
            const errJson = await res.json()
            if (errJson?.message) msg = errJson.message
          } catch {
            /* ignore parse error */
          }
          throw new Error(msg)
        }
        const json = await res.json()
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

        // Fetch employer names only when admin/partner viewing multiple employers.
        if (showEmployerColumn && list.length > 0) {
          try {
            const eRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers`,
              {
                headers: {
                  Authorization: `Bearer ${session.accessToken}`,
                  "Content-Type": "application/json",
                },
              },
            )
            if (eRes.ok) {
              const eJson = await eRes.json()
              const map: Record<number, string> = {}
              for (const e of eJson.data || []) {
                map[e.id] = e.name
              }
              setEmployerNames(map)
            }
          } catch {
            /* swallow — fall back to id */
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
  }, [session?.accessToken, showEmployerColumn])

  const rows = useMemo(
    () =>
      invoices.map((inv) => ({
        id: inv.id,
        publicId: inv.publicId,
        date: inv.issueDate,
        invoiceNo: inv.invoiceNumber,
        employer: employerNames[inv.employerId] || `#${inv.employerId}`,
        total: fmt(inv.total),
        status: inv.status,
      })),
    [invoices, employerNames],
  )

  const baseColumns: any[] = [
    { key: "date", label: t("date"), sortable: true },
    { key: "invoiceNo", label: t("invoiceNo"), sortable: true },
  ]
  if (showEmployerColumn) {
    baseColumns.push({ key: "employer", label: t("employer"), sortable: true })
  }
  const columns = [
    ...baseColumns,
    { key: "total", label: t("total"), sortable: true, align: "right" as const },
    {
      key: "status",
      label: t("status") || "Status",
      sortable: true,
      align: "center" as const,
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

  return (
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
    />
  )
}
