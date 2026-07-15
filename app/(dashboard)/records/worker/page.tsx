"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function WorkerRecordsPage() {
  const router = useRouter()
  const { status, isAuthenticated } = useAuth() as any

  const [jobIdParam, setJobIdParam] = useState<string | null>(null)
  const [paramsLoaded, setParamsLoaded] = useState(false)

  // Read search params on the client to avoid useSearchParams prerender bailout
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setJobIdParam(params.get("jobId"))
    } catch {
      setJobIdParam(null)
    } finally {
      setParamsLoaded(true)
    }
  }, [])

  // jobId is part of the key so each filtered view caches separately.
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["records", "worker", jobIdParam],
    queryFn: async () => {
      const qs = jobIdParam ? `?jobId=${encodeURIComponent(jobIdParam)}` : ""
      const result = await apiFetch<any>(`/jobs/worker/work-session-records${qs}`)
      return result?.isSuccess ? result.data ?? [] : []
    },
    enabled: isAuthenticated && paramsLoaded,
  })
  // Params load client-side, so keep showing the loader until they're read.
  const isLoading = !paramsLoaded || status === "loading" || recordsLoading

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "job", label: "Job", sortable: true },
    { key: "centro", label: "Centro", sortable: true },
    { key: "entrada", label: "Entrada" },
    { key: "salida", label: "Salida" },
    { key: "total", label: "Total", sortable: true },
    { key: "extra", label: "Extra", sortable: true },
    { key: "metodo", label: "Método" },
    { key: "puntualidad", label: "Puntualidad" },
  ]

  const actionButtons = [
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "Filter",
      type: "filter" as const,
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(records, columns, "worker-records.xlsx"),
      title: "Export Excel",
      type: "excel" as const,
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "worker-records.csv"),
      title: "Export CSV",
      type: "csv" as const,
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "worker-records.pdf"),
      title: "Export PDF",
      type: "pdf" as const,
    },
  ]

  const handleRowClick = (item: any) => {
    const recordId = item?.workSessionPublicId || item?.publicId || item?.id
    if (recordId) router.push(`/records/worker/${recordId}`)
  }

  return (
    <DataListTemplate
      title="Registros"
      data={records}
      columns={columns}
      onRowClick={handleRowClick}
      actionButtons={actionButtons}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : "No records found"}
    />
  )
}
