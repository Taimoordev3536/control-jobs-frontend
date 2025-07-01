"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface Column {
  key: string
  label: string
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  totalRecords: number
}

export function DataTable({ data, columns, totalRecords }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null
    return sortDirection === "asc" ? "↑" : "↓"
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} onClick={() => handleSort(column.key)}>
                {column.label} {getSortIcon(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination">
        <div className="pagination-info">
          Showing records 1 to {data.length} of a total of {totalRecords} records
        </div>
        <div className="pagination-controls">
          <button className="pagination-button" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="pagination-button active">1</button>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(Math.min(Math.ceil(totalRecords / 10), currentPage + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
