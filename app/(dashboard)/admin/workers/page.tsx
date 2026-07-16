"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function AdminWorkersPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const { data: workers = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin", "workers"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/worker/admin")
      return (data.data || []).map((w: any) => ({
        id: w.publicId || w.id?.toString() || "",
        name: w.name || "-",
        city: w.city || "-",
        province: w.province || "-",
        occupation: w.occupation || "-",
        employer: w.employer || "-",
        asset: w.active === true || w.active === "true",
      }))
    },
    enabled: isAuthenticated,
  })

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "city", label: t("city"), sortable: true },
    { key: "province", label: t("province"), sortable: true },
    { key: "occupation", label: t("occupation"), sortable: true, align: "left" as const },
    { key: "employer", label: t("employer"), sortable: true },
    {
      key: "asset",
      label: t("asset"),
      sortable: true,
      align: "center" as const,
      render: (value: any) => {
        const isActive = value === true
        return (
          <span className={`font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>
            {isActive ? t("yeah") : t("no")}
          </span>
        )
      },
    },
  ]

  const actionButtons = [
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: t("filter"),
      type: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(workers, columns, "workers.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(workers, columns, "workers.csv"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(workers, columns, "workers.pdf"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]

  return (
    <DataListTemplate
      title={t("workers")}
      data={workers}
      columns={columns}
      actionButtons={actionButtons}
      defaultSortColumn="name"
      defaultSortDirection="asc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noWorkersFound")}
    />
  )
}
