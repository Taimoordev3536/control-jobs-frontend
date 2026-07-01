"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(n || 0).toFixed(2).replace(".", ",")} €`

export default function ClientInvoicesPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session?.accessToken) return
    setIsLoading(true)
    apiFetch<{ data: any[] }>("/client/all/invoices")
      .then((j) => setData(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setData([]))
      .finally(() => setIsLoading(false))
  }, [session?.accessToken])

  const rows = useMemo(
    () =>
      data.map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNumber,
        client: i.clientName || "—",
        date: formatLocalDate(i.issueDate),
        period: `${formatLocalDate(i.periodStart)} – ${formatLocalDate(i.periodEnd)}`,
        total: eur(i.total),
        status: i.status,
      })),
    [data],
  )

  const columns = [
    { key: "invoiceNo", label: t("number") || "Nº", sortable: true, align: "center" as const, width: "140px" },
    { key: "client", label: t("client") || "Cliente", sortable: true, align: "left" as const },
    { key: "date", label: t("date"), sortable: true, align: "center" as const, width: "120px" },
    { key: "period", label: t("period") || "Periodo", align: "center" as const, width: "220px" },
    { key: "total", label: t("total"), sortable: true, align: "center" as const, width: "120px" },
    {
      key: "status",
      label: t("status") || "Estado",
      sortable: true,
      align: "center" as const,
      width: "120px",
      render: (value: string) => {
        const color =
          value === "paid"
            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
            : value === "overdue"
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{value}</span>
      },
    },
  ]

  const actionButtons = [
    { icon: Filter, onClick: () => {}, title: t("filter"), type: "filter" as any },
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "facturas.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "facturas.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
    { icon: PdfIcon, onClick: () => exportToPDF(rows, columns, "facturas.pdf"), title: t("exportPdf") || "Export PDF", type: "pdf" as any },
  ]

  return (
    <DataListTemplate
      title={t("invoices") || "Facturas"}
      data={rows}
      columns={columns}
      actionButtons={actionButtons}
      isLoading={isLoading}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noInvoicesYet") || "No invoices yet"}
    />
  )
}
