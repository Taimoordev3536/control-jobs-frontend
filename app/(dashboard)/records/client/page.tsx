"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AnimatedLoader } from "@/components/animated-loader"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"

export default function ClientRecordsPage() {
  const router = useRouter()

  // ---------------------------
  // DUMMY DATA (Temporary)
  // ---------------------------
  const dummyRecords = [
    {
      id: "100",
      fecha: "2025-01-10",
      titular: "Client A",
      job: "Home Cleaning - House 2",
      trabajador: "Aslam Worker",
      entrada: "09:00",
      salida: "12:30",
      total: "3.5h",
      alerts: "None",
    },
    {
      id: "101",
      fecha: "2025-01-15",
      titular: "Client B",
      job: "Office Maintenance",
      trabajador: "Imran Worker",
      entrada: "10:00",
      salida: "15:00",
      total: "5h",
      alerts: "Missed Break",
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
      onClick: () => exportToXLSX(records, columns, "client-records.xlsx"),
      title: "Export Excel",
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(records, columns, "client-records.csv"),
      title: "Export CSV",
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(records, columns, "client-records.pdf"),
      title: "Export PDF",
      type: "pdf",
    },
  ]

  // ---------------------------
  // ROW CLICK HANDLER
  // ---------------------------
  const handleRowClick = (item: any) => {
    const recordId = item?.publicId || item?.id
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
