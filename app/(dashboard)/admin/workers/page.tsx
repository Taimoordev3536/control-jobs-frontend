"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function AdminWorkersPage() {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [workers, setWorkers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const mapWorker = (w: any) => ({
    id: w.publicId || w.id?.toString() || "",
    name: w.name || "-",
    city: w.city || "-",
    province: w.province || "-",
    occupation: w.occupation || "-",
    employer: w.employer || "-",
    asset: w.active === true || w.active === "true",
  })

  const fetchWorkers = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/admin`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch workers")
      const data = await res.json()
      setWorkers((data.data || []).map(mapWorker))
    } catch (err) {
      console.error("Error fetching workers:", err)
      setWorkers([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

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
