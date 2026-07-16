"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Filter } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(n || 0).toFixed(2).replace(".", ",")} €`

export default function SalariesPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["salaries", "all"],
    queryFn: async () => {
      const j = await apiFetch<{ data: any[] }>("/worker/all/salaries")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: isAuthenticated,
  })

  const rows = useMemo(
    () =>
      data.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNumber,
        worker: r.workerName || "—",
        date: formatLocalDate(r.issueDate),
        period: `${formatLocalDate(r.periodStart)} – ${formatLocalDate(r.periodEnd)}`,
        hours: r.hoursQty ?? 0,
        total: eur(r.total),
        status: r.status,
      })),
    [data],
  )

  const columns = [
    { key: "receiptNo", label: t("number") || "Nº", sortable: true, align: "center" as const, width: "140px" },
    { key: "worker", label: t("worker") || "Trabajador", sortable: true, align: "left" as const },
    { key: "date", label: t("date"), sortable: true, align: "center" as const, width: "120px" },
    { key: "period", label: t("period") || "Periodo", align: "center" as const, width: "220px" },
    { key: "hours", label: t("hours") || "Horas", align: "center" as const, width: "90px" },
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
            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{value}</span>
      },
    },
  ]

  const actionButtons = [
    { icon: Filter, onClick: () => {}, title: t("filter"), type: "filter" as any },
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "salarios.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "salarios.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
    { icon: PdfIcon, onClick: () => exportToPDF(rows, columns, "salarios.pdf"), title: t("exportPdf") || "Export PDF", type: "pdf" as any },
  ]

  return (
    <DataListTemplate
      title={t("salaries") || "Salarios"}
      data={rows}
      columns={columns}
      actionButtons={actionButtons}
      isLoading={isLoading}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noReceiptsYet") || "No receipts yet"}
    />
  )
}
