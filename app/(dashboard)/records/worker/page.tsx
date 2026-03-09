"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatedLoader } from "@/components/animated-loader"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function WorkerRecordsPage() {
  const router = useRouter()

  // ---------------------------
  // DUMMY DATA (Temporary)
  // ---------------------------
  const dummyRecords = [
    {
      id: "500",
      fecha: "2025-01-12",
      titular: "Manager 1",
      job: "Garden Maintenance",
      client: "Client Alpha",
      entrada: "07:30",
      salida: "11:00",
      total: "3.5h",
      alerts: "None",
    },
    {
      id: "501",
      fecha: "2025-01-18",
      titular: "Supervisor 2",
      job: "Cleaning - House 3",
      client: "Client Beta",
      entrada: "09:00",
      salida: "14:00",
      total: "5h",
      alerts: "Late Start",
    },
  ]

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setRecords(dummyRecords)
      setIsLoading(false)
    }, 500)
  }, [])

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
      onClick: () => exportToXLSX(records, columns, "worker-records.xlsx"),
      title: "Export Excel",
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "worker-records.csv"),
      title: "Export CSV",
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "worker-records.pdf"),
      title: "Export PDF",
      type: "pdf",
    },
  ]

  // ---------------------------
  // ROW CLICK HANDLER
  // ---------------------------
  const handleRowClick = (item: any) => {
    const recordId = item?.publicId || item?.id
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
      role="worker"
    />
  )
}
