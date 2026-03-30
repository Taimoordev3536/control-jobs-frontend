"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { AnimatedLoader } from "@/components/animated-loader"

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
  emptyMessage?: string | React.ReactNode
  onRowClick?: (row: any) => void
  className?: string
  itemsPerPage?: number
  totalRecords?: number
  showPagination?: boolean
  // Optional external control for filters: parent can control visibility and filter values
  showFilters?: boolean
  onShowFiltersChange?: (visible: boolean) => void
  filters?: Record<string, string>
  onFiltersChange?: (filters: Record<string, string>) => void
}

export default function TabTableTemplate({
  columns,
  data = [],
  loading = false,
  emptyMessage = "No data available in this table",
  onRowClick,
  className = "",
  itemsPerPage = 10,
  totalRecords,
  showPagination = true,
  showFilters,
  onShowFiltersChange,
  filters: filtersProp,
  onFiltersChange: onFiltersChangeProp,
}: TabTableTemplateProps) {
  const { t } = useTranslation()
  const [localColumns, setLocalColumns] = useState(columns)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [filtersVisibleInternal, setFiltersVisibleInternal] = useState(false)
  const [filtersInternal, setFiltersInternal] = useState<Record<string, string>>({})

  // Use controlled props when provided, otherwise fall back to internal state
  const filtersVisible = typeof showFilters === "boolean" ? showFilters : filtersVisibleInternal
  const setFiltersVisible = (v: boolean) => {
    if (onShowFiltersChange) onShowFiltersChange(v)
    else setFiltersVisibleInternal(v)
  }

  const filters = filtersProp ?? filtersInternal
  const setFilters = (next: Record<string, string>) => {
    if (onFiltersChangeProp) onFiltersChangeProp(next)
    else setFiltersInternal(next)
  }

  const total = totalRecords || data.length
  const totalPages = Math.ceil(total / itemsPerPage)

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    const columnConfig = localColumns.find((col) => col.key === sortColumn)
    if (!columnConfig?.sortable) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (aValue == null || bValue == null) return 0

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(bValue)
      }

      return sortDirection === "asc"
        ? aValue - bValue || 0
        : bValue - aValue || 0
    })
  }, [data, sortColumn, sortDirection, localColumns])

  // Filtering logic (per-column). Uses sortedData as input so filters apply after sorting.
  const filteredData = useMemo(() => {
    if (!filtersVisible) return sortedData
    const activeFilters = Object.entries(filters).filter(([, v]) => v && v.trim() !== "")
    if (activeFilters.length === 0) return sortedData

    return sortedData.filter((row) => {
      return activeFilters.every(([key, value]) => {
        const cell = row?.[key]
        const text = cell == null ? "" : String(cell)
        return text.toLowerCase().includes(value.toLowerCase())
      })
    })
  }, [sortedData, filters, filtersVisible])

  const handleSort = (column: string) => {
    const columnConfig = localColumns.find((col) => col.key === column)
    if (!columnConfig?.sortable) return

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (column: string) => (
    <div className="ml-1 flex flex-col">
      <ChevronUp
        size={17}
        className={`${
          sortColumn === column && sortDirection === "asc"
            ? "text-[#662D91] font-bold"
            : "text-muted-foreground"
        }`}
        strokeWidth={sortColumn === column && sortDirection === "asc" ? 3 : 2}
      />
      <ChevronDown
        size={17}
        className={`-mt-1 ${
          sortColumn === column && sortDirection === "desc"
            ? "text-[#662D91] font-bold"
            : "text-muted-foreground"
        }`}
        strokeWidth={sortColumn === column && sortDirection === "desc" ? 3 : 2}
      />
    </div>
  )

  const getAlignmentClass = (key: string, value: any) => {
    if (typeof value === "number" && key.toLowerCase().includes("factur")) {
      return "text-right"; // Right align for monetary amounts
    } else if (typeof value === "number") {
      return "text-right"; // Right align for other numbers
    } else if (value instanceof Date || !isNaN(Date.parse(value))) {
      return "text-center"; // Center align for dates
    } else {
      return "text-left"; // Left align for text
    }
  };

  function renderValue(value: any, key: string) {
    if (typeof value === "number" && key.toLowerCase().includes("factur")) {
      return value.toFixed(2) + " €"; // Two decimal places for monetary amounts
    }
    return value;
  }

  if (loading) {
    return (
      <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
        <div className="flex items-center justify-center py-12">
          <AnimatedLoader size={32} />
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border ${className}`}>
      <div className="overflow-x-auto">
        <DragDropContext
          onDragEnd={(result: DropResult) => {
            if (!result.destination) return
            const reordered = [...localColumns]
            const [removed] = reordered.splice(result.source.index, 1)
            reordered.splice(result.destination.index, 0, removed)
            setLocalColumns(reordered)
          }}
        >
          <table className="w-full">
            <thead>
              <Droppable droppableId="columns" direction="horizontal">
                {(provided) => (
                  <>
                    <tr
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-purple-50 dark:bg-purple-950/50 border-y-2 border-[#662D91]"
                    >
                      {localColumns.map((column, index) => (
                        <Draggable key={column.key} draggableId={column.key} index={index}>
                          {(provided, snapshot) => (
                            <th
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`px-4 py-[7px] text-xs font-semibold text-foreground transition-colors cursor-move ${
                                snapshot.isDragging ? "bg-purple-200 dark:bg-purple-800" : ""
                              } text-center border border-gray-300 dark:border-gray-700 ${
                                column.sortable ? "hover:bg-purple-100 dark:hover:bg-purple-900/50" : ""
                              }`}
                              onClick={() => column.sortable && handleSort(column.key)}
                            >
                              <div className="flex items-center justify-center">
                                {column.label}
                                {column.sortable && getSortIcon(column.key)}
                              </div>
                            </th>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tr>

                    {/* Filter inputs row - shown when filtersVisible */}
                    {filtersVisible && (
                      <tr className="bg-white">
                        {localColumns.map((column) => (
                          <th key={`filter-${column.key}`} className="px-4 py-2 text-xs font-normal text-foreground border border-gray-300 dark:border-gray-700">
                            <input
                              type="text"
                              value={filters[column.key] || ""}
                              onChange={(e) => setFilters((prev) => ({ ...prev, [column.key]: e.target.value }))}
                              placeholder={t("filter") + "..."}
                              className="w-full p-1 text-sm border rounded focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91]"
                            />
                          </th>
                        ))}
                      </tr>
                    )}
                  </>
                )}
              </Droppable>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-2 text-center text-muted-foreground text-lg border border-gray-300 dark:border-gray-700"
                  >
                    {loading ? (
                      <AnimatedLoader size={32} className="py-4" />
                    ) : typeof emptyMessage === 'string' ? (
                      emptyMessage
                    ) : (
                      emptyMessage
                    )}
                  </td>
                </tr>
              ) : (
                filteredData
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((row, index) => (
                    <tr
                      key={row.id || index}
                      className={`border-b border-border transition-colors ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      } ${onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : ""}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {localColumns.map((column) => (
                        <td
                          key={`${row.id || index}-${column.key}`}
                          className={`px-3 py-2 text-sm ${
                            column.key === localColumns[0].key
                              ? "text-foreground font-medium"
                              : "text-muted-foreground"
                          } ${getAlignmentClass(column.key, row[column.key])} border border-gray-300 dark:border-gray-700`}
                        >
                          {renderValue(row[column.key], column.key) || "-"}
                        </td>
                      ))}
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </DragDropContext>
      </div>

      {/* Pagination */}
      {showPagination && filteredData.length > 0 && (
        <div className="px-4 py-1.5 flex items-center justify-between border-t border-border bg-card bg-gray-100 dark:bg-gray-800">
          <div className="text-xs text-muted-foreground">
            {t("showingRecordsFrom")} {((currentPage - 1) * itemsPerPage + 1)} {t("to")}{" "}
            {Math.min(currentPage * itemsPerPage, total)} {t("outOfTotal")} {total} {t("records")}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              {t("back")}
            </button>
            <button className="px-2 py-0.5 text-xs bg-[#662D91] text-white rounded-md hover:bg-[#532073] transition-colors">
              {currentPage}
            </button>
            <button
              className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
