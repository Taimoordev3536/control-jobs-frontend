"use client"

import { ChevronUp, ChevronDown } from "lucide-react"
import { useState } from "react"
import { IconSwapButton } from "./icon-swap-button"

// Placeholder SVG components - replace with your actual imports
const AddIcon1 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const AddIcon2 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="purple" stroke="purple" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const FilterIcon1 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
)

const FilterIcon2 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="purple" stroke="purple" strokeWidth="2">
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
)

const PdfIcon1 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
)

const PdfIcon2 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="purple" stroke="purple" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
)

const XlsIcon1 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </svg>
)

const XlsIcon2 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="purple" stroke="purple" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </svg>
)

const CsvIcon1 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
)

const CsvIcon2 = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="purple" stroke="purple" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
)

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  totalRecords: number
  title?: string
  onAdd?: () => void
  onFilter?: () => void
  onExportPdf?: () => void
  onExportXls?: () => void
  onExportCsv?: () => void
  itemsPerPage?: number
}

export function DataTable({
  data,
  columns,
  totalRecords,
  title = "Data Table",
  onAdd,
  onFilter,
  onExportPdf,
  onExportXls,
  onExportCsv,
  itemsPerPage = 10,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const totalPages = Math.ceil(totalRecords / itemsPerPage)
  const startRecord = (currentPage - 1) * itemsPerPage + 1
  const endRecord = Math.min(currentPage * itemsPerPage, totalRecords)

  const handleSort = (column: string) => {
    if (!columns.find((col) => col.key === column)?.sortable) return

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  const goToPreviousPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1))
  }

  const goToNextPage = () => {
    setCurrentPage(Math.min(totalPages, currentPage + 1))
  }

  return (
    <div className="w-full bg-white">
      {/* Header with title and action buttons */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <div className="flex gap-2">
          {onAdd && <IconSwapButton Icon1={AddIcon1} Icon2={AddIcon2} onClick={onAdd} title="Add new record" />}
          {onFilter && (
            <IconSwapButton Icon1={FilterIcon1} Icon2={FilterIcon2} onClick={onFilter} title="Filter records" />
          )}
          {onExportPdf && (
            <IconSwapButton Icon1={PdfIcon1} Icon2={PdfIcon2} onClick={onExportPdf} title="Export to PDF" />
          )}
          {onExportXls && (
            <IconSwapButton Icon1={XlsIcon1} Icon2={XlsIcon2} onClick={onExportXls} title="Export to Excel" />
          )}
          {onExportCsv && (
            <IconSwapButton Icon1={CsvIcon1} Icon2={CsvIcon2} onClick={onExportCsv} title="Export to CSV" />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-left py-4 px-0 text-gray-600 font-medium ${
                    column.sortable ? "cursor-pointer hover:text-gray-900" : ""
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable && getSortIcon(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={row.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={`${row.id || index}-${column.key}`} className="py-4 px-0 text-gray-900">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-gray-600">
          Showing records {startRecord} to {endRecord} of a total of {totalRecords} records
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            Former
          </button>
          <button className="px-3 py-1 bg-purple-600 text-white rounded">{currentPage}</button>
          <button
            className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Following
          </button>
        </div>
      </div>
    </div>
  )
}
