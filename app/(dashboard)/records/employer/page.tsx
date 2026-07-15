"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { AnimatedLoader } from "@/components/animated-loader"

import FilterIcon1 from "../../../../icons/Controles/filter1.svg"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"

export default function EmployerRecordsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth() as any
  const { t } = useTranslation("employer-dashboard")
  const [jobIdParam, setJobIdParam] = useState<string | null>(null)
  const [paramsLoaded, setParamsLoaded] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Read search params from window.location on the client to avoid
  // useSearchParams prerender bailout during static export.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setJobIdParam(params.get('jobId'))
      setParamsLoaded(true)
    } catch (e) {
      setJobIdParam(null)
      setParamsLoaded(true)
    }
  }, [])

  // jobId is part of the key so each filtered view caches separately.
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["records", "employer", jobIdParam],
    queryFn: async () => {
      const qs = jobIdParam ? `?jobId=${encodeURIComponent(jobIdParam)}` : ""
      const result = await apiFetch<any>(`/jobs/employer/work-session-records${qs}`)
      return result?.isSuccess ? result.data ?? [] : []
    },
    enabled: isAuthenticated && paramsLoaded,
  })
  // Params load client-side, so keep showing the loader until they're read.
  const isLoading = !paramsLoaded || authLoading || recordsLoading

  const columns = [
    { key: "fecha", label: t("checkInCheckOut"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "trabajador", label: t("trabajador"), sortable: true },
    { key: "centro", label: "Centro", sortable: true },
    { key: "entrada", label: t("entrada") },
    { key: "salida", label: t("salida") },
    { key: "total", label: t("total"), sortable: true },
    { key: "extra", label: "Extra", sortable: true },
    { key: "metodo", label: "Método" },
    { key: "puntualidad", label: "Puntualidad" },
  ]

  // ---------------------------
  // ACTION BUTTONS
  // ---------------------------
  const actionButtons = [
    {
      icon: FilterIcon1,
      onClick: () => setShowFilters(!showFilters),
      title: t("filter"),
      type: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(records, columns, "employer-records.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "employer-records.csv"),
      title: t("exportCSV"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "employer-records.pdf"),
      title: t("exportPDF"),
      type: "pdf",
    },
  ]

  // ---------------------------
  // ROW CLICK HANDLER
  // ---------------------------
  const handleRowClick = (item: any) => {
    // Navigate to the work session detail page using publicId
    const workSessionId = item?.workSessionPublicId || item?.workSessionId
    if (workSessionId) {
      router.push(`/records/employer/${workSessionId}`)
    }
  }

  return (
    <DataListTemplate
      title={t("recordsTitle")}
      data={records}
      columns={columns}
      onRowClick={handleRowClick}
      actionButtons={actionButtons}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noRecordsFound")}
      role="employer"
    />
  )
}
