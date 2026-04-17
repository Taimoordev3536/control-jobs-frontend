"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function WorkerRecordsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get("jobId")
  const { session, status } = useAuth() as any

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      if (status === "loading") return
      if (!session?.accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/worker/work-session-records`)
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
          console.error("Failed to fetch worker records:", result.message, result.developerError)
          setRecords([])
        }
      } catch (err) {
        console.error("Error fetching worker records:", err)
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [jobIdParam, session?.accessToken, status])

  const columns = [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "titular", label: "Titular", sortable: true },
    { key: "job", label: "Job", sortable: true },
    { key: "client", label: "Client", sortable: true },
    { key: "entrada", label: "Entrada" },
    { key: "salida", label: "Salida" },
    { key: "total", label: "Total", sortable: true },
    { key: "alerts", label: "Alertas" },
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
