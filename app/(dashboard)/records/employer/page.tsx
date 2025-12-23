// import DataListTemplate from "@/components/ui/data-list-template";

// const columns = [
//   { key: "fecha", label: "Fecha" },
//   { key: "titular", label: "Titular" },
//   { key: "job", label: "Job" },
//   { key: "trabajador", label: "Trabajador" },
//   { key: "entrada", label: "Entrada" },
//   { key: "salida", label: "Salida" },
//   { key: "total", label: "Total" },
//   { key: "alerts", label: "Alertas" },
// ];

// export default function EmployerRecordsPage() {
//   // TODO: Fetch employer records data
//   return (
//     <DataListTemplate columns={columns} role="employer" />
//   );
// }



"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Plus, Filter } from "lucide-react"

export default function EmployerRecordsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [jobIdParam, setJobIdParam] = useState<string | null>(null)

  // Read search params from window.location on the client to avoid
  // useSearchParams prerender bailout during static export.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setJobIdParam(params.get('jobId'))
    } catch (e) {
      setJobIdParam(null)
    }
  }, [])

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real work session records
  useEffect(() => {
    const fetchRecords = async () => {
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
  }, [jobIdParam, session?.accessToken])

  const columns = [
    { key: "fecha", label: "Check In - Check Out", sortable: true },
    { key: "titular", label: "Titular", sortable: true },
    { key: "job", label: "Job", sortable: true },
    { key: "trabajador", label: "Trabajador", sortable: true },
    { key: "entrada", label: "Entrada" },
    { key: "salida", label: "Salida" },
    { key: "total", label: "Total", sortable: true },
    { key: "alerts", label: "Alertas" },
  ]

  // ---------------------------
  // ACTION BUTTONS
  // ---------------------------
  const actionButtons = [
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "Filter",
      type: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(records, columns, "employer-records.xlsx"),
      title: "Export Excel",
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "employer-records.csv"),
      title: "Export CSV",
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "employer-records.pdf"),
      title: "Export PDF",
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
      title="Registros"
      data={records}
      columns={columns}
      onRowClick={handleRowClick}
      actionButtons={actionButtons}
      emptyMessage={isLoading ? "Loading..." : "No records found"}
      role="employer"
    />
  )
}
