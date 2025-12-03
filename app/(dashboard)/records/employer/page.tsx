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

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Plus, Filter } from "lucide-react"

export default function EmployerRecordsPage() {
  const router = useRouter()

  // ---------------------------
  // DUMMY DATA (Temporary)
  // ---------------------------
  const dummyRecords = [
    {
      id: "1",
      fecha: "2025-01-01",
      titular: "John Manager",
      job: "Cleaning - Home 1",
      trabajador: "Ali Worker",
      entrada: "08:00",
      salida: "12:00",
      total: "4h",
      alerts: "None",
    },
    {
      id: "2",
      fecha: "2025-01-03",
      titular: "Smith Manager",
      job: "Office Maintenance",
      trabajador: "Bilal Worker",
      entrada: "09:00",
      salida: "14:00",
      total: "5h",
      alerts: "Late Entry",
    },
  ]

  const [records, setRecords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load DUMMY data
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
    const recordId = item?.id
    if (recordId) router.push(`/records/employer/${recordId}`)
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
