"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function ClientRecordsPage() {
  const router = useRouter()
  const { t } = useTranslation()
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
    queryKey: ["records", "client", jobIdParam],
    queryFn: async () => {
      const qs = jobIdParam ? `?jobId=${encodeURIComponent(jobIdParam)}` : ""
      const result = await apiFetch<any>(`/jobs/client/work-session-records${qs}`)
      return result?.isSuccess ? result.data ?? [] : []
    },
    enabled: isAuthenticated && paramsLoaded,
  })
  // Params load client-side, so keep showing the loader until they're read.
  const isLoading = !paramsLoaded || status === "loading" || recordsLoading

  // The API ships pre-localized Spanish in fecha/salida/puntualidad; ignore it
  // and derive the labels client-side from the neutral flags (isActive,
  // checkOutTime, punctuality code) so they follow the UI language. Exports
  // read these rows too, so they stay consistent.
  const rows = useMemo(
    () =>
      (records ?? []).map((r: any) => {
        const inProgress = !r.checkOutTime && !!r.isActive
        const fechaStart = String(r.fecha ?? "").split(" - ")[0]
        const punct = r.punctuality
          ? r.punctuality === "late"
            ? `${t("late")}${r.lateMinutes ? ` +${r.lateMinutes}m` : ""}`
            : r.punctuality === "early"
              ? t("early")
              : t("onTime")
          : inProgress
            ? t("activeSession")
            : "—"
        return {
          ...r,
          fecha: inProgress ? `${fechaStart} - ${t("inProgress")}` : r.fecha || "—",
          salida: r.checkOutTime ? r.salida || "—" : inProgress ? t("inProgress") : "—",
          puntualidad: punct,
        }
      }),
    [records, t],
  )

  const columns = [
    { key: "fecha", label: t("date"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "centro", label: t("center"), sortable: true },
    { key: "worker", label: t("worker"), sortable: true },
    { key: "entrada", label: t("alertSignIn") },
    { key: "salida", label: t("alertSignOut") },
    { key: "total", label: t("total"), sortable: true },
    { key: "extra", label: t("extra"), sortable: true },
    { key: "metodo", label: t("method") },
    { key: "puntualidad", label: t("punctuality") },
  ]

  const actionButtons = [
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: t("filter"),
      type: "filter" as const,
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(rows, columns, "client-records.xlsx"),
      title: t("exportExcel"),
      type: "excel" as const,
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(rows, columns, "client-records.csv"),
      title: t("exportCsv"),
      type: "csv" as const,
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(rows, columns, "client-records.pdf"),
      title: t("exportPdf"),
      type: "pdf" as const,
    },
  ]

  const handleRowClick = (item: any) => {
    const recordId = item?.recordId || item?.publicId || item?.id
    if (recordId) router.push(`/records/client/${recordId}`)
  }

  return (
    <DataListTemplate
      title={t("recordsTitle")}
      data={rows}
      columns={columns}
      onRowClick={handleRowClick}
      actionButtons={actionButtons}
      emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noRecordsFound")}
      role="client"
    />
  )
}
