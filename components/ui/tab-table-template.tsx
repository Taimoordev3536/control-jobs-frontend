"use client"

import type React from "react"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

export interface TabTableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: "left" | "center" | "right"
  render?: (value: any, row: any) => React.ReactNode
}

interface TabTableTemplateProps {
  columns: TabTableColumn[]
  data?: any[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: any) => void
  className?: string
}

export default function TabTableTemplate({
  columns,
  data = [],
  loading = false,
  emptyMessage = "No data available in this table",
  onRowClick,
  className = "",
}: TabTableTemplateProps) {
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
    return (
      <div className="ml-1 flex flex-col">
        <ChevronUp
          size={14}
          className={`text-muted-foreground ${
            sortColumn === column && sortDirection === "asc" ? "text-purple-600" : ""
          }`}
        />
        <ChevronDown
          size={14}
          className={`text-muted-foreground -mt-1 ${
            sortColumn === column && sortDirection === "desc" ? "text-purple-600" : ""
          }`}
        />
      </div>
    )
  }

  const getAlignmentClass = (align?: string) => {
    switch (align) {
      case "center":
        return "text-center"
      case "right":
        return "text-right"
      default:
        return "text-left"
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  if (loading) {
    return (
      <div className={`bg-card ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-4 ${getAlignmentClass(column.align)} text-sm font-semibold text-foreground ${
                    column.sortable
                      ? "cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                      : ""
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center justify-start">
                    {column.label}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-6 py-4 text-sm ${getAlignmentClass(column.align)}`}>
                      {column.render ? column.render(row[column.key], row) : row[column.key] || "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-card">
        <div className="text-sm text-muted-foreground">
          Showing records 0 to {sortedData.length} of a total of {sortedData.length} records
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Former
          </button>
          <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Following
          </button>
        </div>
      </div>
    </div>
  )
}
