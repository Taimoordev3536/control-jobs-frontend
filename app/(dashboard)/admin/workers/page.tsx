"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { ShowInactiveToggle } from "@/components/ui/show-inactive-toggle"

export default function AdminWorkersPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const [showInactive, setShowInactive] = useState(false)

  const { data: allWorkers = [], isLoading } = useQuery<any[]>({
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

  const inactiveCount = allWorkers.filter((w: any) => !w.asset).length
  // Two views, never mixed: the toggle swaps active for inactive. Every row in
  // view then has the same status, so no status column is needed.
  const workers = allWorkers.filter((w: any) => (showInactive ? !w.asset : w.asset))

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "city", label: t("city"), sortable: true },
    { key: "province", label: t("province"), sortable: true },
    { key: "occupation", label: t("occupation"), sortable: true, align: "left" as const },
    { key: "employer", label: t("employer"), sortable: true },
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
      toolbarExtra={
        <ShowInactiveToggle
          checked={showInactive}
          onCheckedChange={setShowInactive}
          count={inactiveCount}
        />
      }
      actionButtons={actionButtons}
      defaultSortColumn="name"
      defaultSortDirection="asc"
      emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noWorkersFound")}
    />
  )
}
