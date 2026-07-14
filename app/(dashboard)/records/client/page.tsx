"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function ClientRecordsPage() {
  const router = useRouter()
  const { session, status } = useAuth() as any

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    const fetchRecords = async () => {
      if (status === "loading" || !paramsLoaded) return
      if (!session?.accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/client/work-session-records`)
        if (jobIdParam) url.searchParams.append("jobId", jobIdParam)

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        const result = await response.json()
        if (result.isSuccess) {
          setRecords(result.data)
        } else {
          console.error("Failed to fetch client records:", result.message, result.developerError)
          setRecords([])
        }
      } catch (err) {
        console.error("Error fetching client records:", err)
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [jobIdParam, session?.accessToken, status, paramsLoaded])

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "job", label: "Job", sortable: true },
    { key: "centro", label: "Centro", sortable: true },
    { key: "worker", label: "Trabajador", sortable: true },
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
      onClick: () => exportToXLSX(records, columns, "client-records.xlsx"),
      title: "Export Excel",
      type: "excel" as const,
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "client-records.csv"),
      title: "Export CSV",
      type: "csv" as const,
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "client-records.pdf"),
      title: "Export PDF",
      type: "pdf" as const,
    },
  ]

  const handleRowClick = (item: any) => {
    const recordId = item?.recordId || item?.publicId || item?.id
    if (recordId) router.push(`/records/client/${recordId}`)
  }

  return (
    <DataListTemplate
      title="Registros"
      data={records}
      columns={columns}
      onRowClick={handleRowClick}
      actionButtons={actionButtons}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : "No records found"}
      role="client"
    />
  )
}
