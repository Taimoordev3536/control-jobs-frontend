"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslation } from "@/hooks/use-translation"

import FilterIcon1 from "../../../../icons/Controles/filter1.svg"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"

export default function EmployerRecordsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
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

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real work session records
  useEffect(() => {
    const fetchRecords = async () => {
      // Wait for session to be authenticated and params to be loaded
      if (status === 'loading' || !paramsLoaded) {
        return
      }

      if (!session?.accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/employer/work-session-records`)
        
        // Add jobId filter if provided
        if (jobIdParam) {
          url.searchParams.append('jobId', jobIdParam)
        }

        console.log('Fetching from URL:', url.toString())
        console.log('Token:', session.accessToken ? 'Present' : 'Missing')
        console.log('Session Status:', status)
        console.log('Params Loaded:', paramsLoaded)

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('Response status:', response.status)
        const result = await response.json()
        console.log('API Response:', result)
        
        if (result.isSuccess) {
          console.log('Records fetched:', result.data.length)
          setRecords(result.data)
        } else {
          console.error('Failed to fetch records:', result.message)
          console.error('Developer error:', result.developerError)
          setRecords([])
        }
      } catch (error) {
        console.error('Error fetching work session records:', error)
        setRecords([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [jobIdParam, session?.accessToken, status, paramsLoaded])

  const columns = [
    { key: "fecha", label: t("checkInCheckOut"), sortable: true },
    { key: "titular", label: t("titular"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "trabajador", label: t("trabajador"), sortable: true },
    { key: "entrada", label: t("entrada") },
    { key: "salida", label: t("salida") },
    { key: "total", label: t("total"), sortable: true },
    { key: "alerts", label: t("alertas") },
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
    // Navigate to the work session detail page
    const workSessionId = item?.workSessionId
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
      emptyMessage={isLoading ? t("loading") : t("noRecordsFound")}
      role="employer"
    />
  )
}
