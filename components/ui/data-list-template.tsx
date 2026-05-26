"use client"

import type React from "react"
import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { ChevronUp, ChevronDown, MoreVertical, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"

import AddIcon1 from "../../icons/Controles/add1.svg"
import AddIcon2 from "../../icons/Controles/add2.svg"
import FilterIcon1 from "../../icons/Controles/filter1.svg"
import FilterIcon2 from "../../icons/Controles/filter2.svg"
import CsvIcon1 from "../../icons/Controles/csv1.svg"
import CsvIcon2 from "../../icons/Controles/csv2.svg"
import ExcelIcon1 from "../../icons/Controles/xls1.svg"
import ExcelIcon2 from "../../icons/Controles/xls2.svg"
import PdfIcon1 from "../../icons/Controles/pdf1.svg"
import PdfIcon2 from "../../icons/Controles/pdf2.svg"

interface Column {
  key: string
  label: string
  sortable?: boolean
  align?: "left" | "center" | "right"
  width?: string
  render?: (value: any, row: any) => React.ReactNode
}

interface ActionButton {
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  title: string
  type: "add" | "filter" | "csv" | "excel" | "pdf"
  variant?: "primary" | "secondary"
}

interface DataListTemplateProps {
  title: string
  data: any[]
  columns: Column[]
  isLoading?: boolean
  onRowClick?: (id: number) => void
  actionButtons?: ActionButton[]
  itemsPerPage?: number
  totalRecords?: number
  showPagination?: boolean
  emptyMessage?: string | React.ReactNode
  defaultSortColumn?: string
  defaultSortDirection?: "asc" | "desc"
  pinnedRows?: any[]
}

export default function DataListTemplate({
  title,
  data,
  columns,
  isLoading = false,
  onRowClick,
  actionButtons = [],
  itemsPerPage = 10,
  totalRecords,
  showPagination = true,
  emptyMessage = "No data available",
  defaultSortColumn = null,
  defaultSortDirection = "asc",
  pinnedRows = [],
}: DataListTemplateProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [localColumns, setLocalColumns] = useState(columns)
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortColumn)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultSortDirection)
  const [currentPage, setCurrentPage] = useState(1)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [goToPageInput, setGoToPageInput] = useState("")
  const tableRef = useRef<HTMLTableElement | null>(null)
  const [columnWidths, setColumnWidths] = useState<number[] | null>(null)

  // Helper: extract a plain string from any React node (handles span/strong/array/etc.)
  const reactNodeToString = (node: any): string => {
    if (node == null || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(reactNodeToString).join("")
    if (typeof node === "object" && node.props) return reactNodeToString(node.props.children)
    return ""
  }

  // Helper: get the searchable/filterable text for a cell — uses column.render output if present,
  // localizes booleans, and falls back to String(value).
  const getCellText = useCallback(
    (row: any, column: Column): string => {
      const value = row?.[column.key]
      if (column.render) {
        try {
          return reactNodeToString(column.render(value, row)).trim()
        } catch {
          /* fall through */
        }
      }
      if (typeof value === "boolean") return value ? t("yeah") : t("no")
      return value == null ? "" : String(value)
    },
    [t]
  )

  // Sync column labels when translations/props change, preserving drag-and-drop order
  useEffect(() => {
    setLocalColumns((prev) => {
      const labelMap = new Map(columns.map((c) => [c.key, c.label]))
      return prev.map((col) => ({
        ...col,
        label: labelMap.get(col.key) ?? col.label,
      }))
    })
  }, [columns])

  const total = totalRecords || (data?.length ?? 0)
  const totalPages = Math.ceil(total / itemsPerPage)

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!data) return []
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
          : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc"
        ? aValue - bValue || 0
        : bValue - aValue || 0
    })
  }, [data, sortColumn, sortDirection, localColumns])

  const filteredData = useMemo(() => {
    let result = sortedData

    // Global search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) =>
        localColumns.some((col) => getCellText(row, col).toLowerCase().includes(query))
      )
    }

    // Column filters
    if (filtersVisible) {
      const activeFilters = Object.entries(filters).filter(([, v]) => v && v.trim() !== "")
      if (activeFilters.length > 0) {
        result = result.filter((row) => {
          return activeFilters.every(([key, value]) => {
            const col = localColumns.find((c) => c.key === key)
            if (!col) return true
            return getCellText(row, col).toLowerCase().includes(value.toLowerCase())
          })
        })
      }
    }

    return result
  }, [sortedData, filters, filtersVisible, searchQuery, localColumns, getCellText])

  // When filters/search reduce results so currentPage is out of range, snap back to page 1.
  // This fixes the "filters only work on page 1" bug — typing into a filter while on page 2+
  // previously left currentPage past the end of filteredData and showed nothing.
  useEffect(() => {
    const filteredTotalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage))
    if (currentPage > filteredTotalPages) {
      setCurrentPage(1)
    }
  }, [filteredData.length, itemsPerPage, currentPage])

  // Measure column widths once after the table first renders with data, then lock them in
  // with table-layout: fixed so they don't reflow as filtering shrinks cell content.
  useLayoutEffect(() => {
    if (columnWidths) return
    if (!tableRef.current) return
    if ((data?.length ?? 0) === 0) return
    const ths = tableRef.current.querySelectorAll<HTMLTableCellElement>("thead tr:first-child th")
    if (ths.length === 0) return
    const widths = Array.from(ths).map((th) => th.getBoundingClientRect().width)
    if (widths.every((w) => w > 0)) setColumnWidths(widths)
  }, [data, columnWidths, localColumns.length])

  // Reset locked widths if column count or order changes (e.g. via drag-and-drop) so we re-measure.
  useEffect(() => {
    setColumnWidths(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localColumns.length])

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

  const handleRowClick = (e: React.MouseEvent, row: any) => {
    e.stopPropagation()
    if (onRowClick) {
      onRowClick(row)
    }
  }

  const getAlignmentClass = (column: Column, value: any) => {
    // Respect explicit column alignment first
    if (column.align === "center") return "text-center";
    if (column.align === "right") return "text-right";
    if (column.align === "left") return "text-left";
    // Auto-detect only if no explicit align set
    if (typeof value === "number" && column.key.toLowerCase().includes("factur")) {
      return "text-right"; // Right align for monetary amounts
    } else if (typeof value === "number") {
      return "text-right"; // Right align for other numbers
    } else {
      return "text-left"; // Left align for everything else
    }
  };

  function renderValue(value: any, key: string) {
    if (typeof value === "number" && key.toLowerCase().includes("factur")) {
      return value.toFixed(2) + " €"; // Two decimal places for monetary amounts
    }
    return value;
  }

  function ActionIconButton({
    IconDefault,
    IconHover,
    onClick,
    title,
  }: {
    IconDefault: React.ComponentType<{ className?: string }>
    IconHover: React.ComponentType<{ className?: string }>
    onClick: () => void
    title: string
  }) {
    const [hovered, setHovered] = useState(false)
    return (
      <button
        onClick={onClick}
        className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? <IconHover className="w-5 h-5" /> : <IconDefault className="w-5 h-5" />}
      </button>
    )
  }

  function MobileDropdown({ actionButtons }: { actionButtons: ActionButton[] }) {
    const [open, setOpen] = useState(false)

    const getIcons = (type: string) => {
      switch (type) {
        case "csv":
          return { IconDefault: CsvIcon1, IconHover: CsvIcon2 }
        case "excel":
          return { IconDefault: ExcelIcon1, IconHover: ExcelIcon2 }
        case "pdf":
          return { IconDefault: PdfIcon1, IconHover: PdfIcon2 }
        case "filter":
          return { IconDefault: FilterIcon1, IconHover: FilterIcon2 }
        default:
          return { IconDefault: AddIcon1, IconHover: AddIcon2 }
      }
    }

    const mobileButtons = actionButtons.filter((button) =>
      ["csv", "excel", "pdf", "filter"].includes(button.type)
    )

    return (
      <div className="relative sm:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded shadow-lg z-50 w-40">
            {mobileButtons.map((button, index) => {
              const { IconDefault } = getIcons(button.type)
              return (
                <div
                  key={index}
                  onClick={() => {
                    setOpen(false)
                    button.onClick()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <IconDefault className="w-6 h-6" />
                  {button.title}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-2 bg-background min-h-screen relative">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center px-3 py-1.5 border-b border-border bg-gray-100 dark:bg-gray-800">
          <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                placeholder={t("search") || "Search..."}
                className="w-[8.5rem] h-[2rem] px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91] bg-background"
              />
            </div>
            {actionButtons.length > 0 && (
              <>
                {/* Desktop and Tablet Buttons */}
                <div className="flex items-center gap-2 sm:flex">
                  {actionButtons.map((button, index) => {
                    const isMobileButton = ["csv", "excel", "pdf", "filter"].includes(button.type)

                    let IconDefault = AddIcon1
                    let IconHover = AddIcon2
                    switch (button.type) {
                      case "filter":
                        IconDefault = FilterIcon1
                        IconHover = FilterIcon2
                        break
                      case "csv":
                        IconDefault = CsvIcon1
                        IconHover = CsvIcon2
                        break
                      case "excel":
                        IconDefault = ExcelIcon1
                        IconHover = ExcelIcon2
                        break
                      case "pdf":
                        IconDefault = PdfIcon1
                        IconHover = PdfIcon2
                        break
                    }

                    return (
                      <div key={index} className={isMobileButton ? "hidden sm:block" : "hidden sm:flex"}>
                        <ActionIconButton
                          IconDefault={IconDefault}
                          IconHover={IconHover}
                          onClick={() => {
                            // If this is the filter button, toggle the filter row visibility
                            if (button.type === "filter") {
                              setFiltersVisible((v) => !v)
                            }
                            try {
                              button.onClick && button.onClick()
                            } catch (e) {
                              // ignore
                            }
                          }}
                          title={button.title}
                        />
                      </div>
                    )
                  })}
                </div>
                {/* Mobile Dropdown */}
                <MobileDropdown actionButtons={actionButtons} />
              </>
            )}
          </div>
        </div>

        {/* Table */}
        {(sortedData?.length ?? 0) === 0 && pinnedRows.length === 0 ? (
          <div className="p-12 text-center">
            {typeof emptyMessage === 'string' ? (
              <p className="text-muted-foreground text-lg">{emptyMessage}</p>
            ) : (
              emptyMessage
            )}
          </div>
        ) : (
          <>
            {/* ── Mobile card view (< md) ── */}
            <div className="md:hidden divide-y divide-border">
              {/* Pinned rows always appear first */}
              {currentPage === 1 && pinnedRows.map((row, index) => (
                <div
                  key={`pinned-${row.id || index}`}
                  className="p-4 space-y-2 transition-colors bg-purple-50/50 dark:bg-purple-950/20 border-b-2 border-[#662D91]/20"
                >
                  {localColumns[0] && (
                    <div className="text-sm font-semibold text-[#662D91] dark:text-purple-300">
                      {localColumns[0].render
                        ? localColumns[0].render(row[localColumns[0].key], row)
                        : renderValue(row[localColumns[0].key], localColumns[0].key)}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {localColumns.slice(1).map((column) => (
                      <div key={column.key} className="contents">
                        <span className="text-xs font-medium text-muted-foreground truncate">{column.label}</span>
                        <span className="text-xs text-foreground truncate text-right">
                          {column.render
                            ? column.render(row[column.key], row)
                            : renderValue(row[column.key], column.key) || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                <div
                  key={row.id || index}
                  onClick={(e) => handleRowClick(e, row)}
                  className={`p-4 space-y-2 transition-colors ${
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  } ${onRowClick ? "cursor-pointer active:bg-muted/50" : ""}`}
                >
                  {/* First column as title */}
                  {localColumns[0] && (
                    <div className="text-sm font-semibold text-[#662D91] dark:text-purple-300">
                      {localColumns[0].render
                        ? localColumns[0].render(row[localColumns[0].key], row)
                        : renderValue(row[localColumns[0].key], localColumns[0].key)}
                    </div>
                  )}
                  {/* Other columns as label:value rows */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {localColumns.slice(1).map((column) => (
                      <div key={column.key} className="contents">
                        <span className="text-xs font-medium text-muted-foreground truncate">{column.label}</span>
                        <span className="text-xs text-foreground truncate text-right">
                          {column.render
                            ? column.render(row[column.key], row)
                            : renderValue(row[column.key], column.key) || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table view (≥ md) ── */}
            <div className="overflow-x-auto hidden md:block">
            <DragDropContext
              onDragEnd={(result: DropResult) => {
                if (!result.destination) return
                const reordered = [...localColumns]
                const [removed] = reordered.splice(result.source.index, 1)
                reordered.splice(result.destination.index, 0, removed)
                setLocalColumns(reordered)
                // Re-measure widths after a reorder
                setColumnWidths(null)
              }}
            >
              <table
                ref={tableRef}
                className="w-full"
                style={{
                  minWidth: `${localColumns.reduce(
                    (sum, c) => sum + (c.width ? parseInt(c.width, 10) || 150 : 150),
                    0,
                  )}px`,
                  ...(columnWidths || localColumns.some((c) => c.width)
                    ? { tableLayout: "fixed" as const }
                    : {}),
                }}
              >
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
                                  style={{
                                    ...(provided.draggableProps as any).style,
                                    ...(column.width
                                      ? { width: column.width }
                                      : columnWidths && columnWidths[index] != null
                                        ? { width: `${columnWidths[index]}px` }
                                        : {}),
                                  }}
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
                                  size={1}
                                  value={filters[column.key] || ""}
                                  onChange={(e) => setFilters((prev) => ({ ...prev, [column.key]: e.target.value }))}
                                  placeholder={t("filter") + "..."}
                                  className="w-full min-w-0 p-1 text-sm border rounded focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91]"
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
                  {/* Pinned rows always appear first on page 1 */}
                  {currentPage === 1 && pinnedRows.map((row, index) => (
                    <tr
                      key={`pinned-${row.id || index}`}
                      className="border-b-2 border-[#662D91]/20 bg-purple-50/50 dark:bg-purple-950/20"
                    >
                      {localColumns.map((column) => (
                        <td
                          key={`pinned-${row.id || index}-${column.key}`}
                          className={`px-3 py-2 text-sm ${
                            column.key === localColumns[0].key ? "text-foreground font-medium" : "text-muted-foreground"
                          } ${getAlignmentClass(column, row[column.key])} border border-gray-300 dark:border-gray-700`}
                        >
                          {column.render
                            ? column.render(row[column.key], row)
                            : renderValue(row[column.key], column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                    <tr
                      key={row.id || index}
                      onClick={(e) => handleRowClick(e, row)}
                      className={`border-b border-border transition-colors ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      } ${onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : ""}`}
                    >
                      {localColumns.map((column) => (
                        <td
                          key={`${row.id || index}-${column.key}`}
                          className={`px-3 py-2 text-sm ${
                            column.key === localColumns[0].key ? "text-foreground font-medium" : "text-muted-foreground"
                          } ${getAlignmentClass(column, row[column.key])} border border-gray-300 dark:border-gray-700`}
                        >
                          {column.render
                            ? column.render(row[column.key], row)
                            : renderValue(row[column.key], column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragDropContext>
          </div>
          </>
        )}

        {/* Pagination */}
        {showPagination && filteredData.length > 0 && (() => {
          const filteredTotalPages = Math.ceil(filteredData.length / itemsPerPage)

          // Generate page numbers with ellipsis
          const getPageNumbers = () => {
            const pages: (number | string)[] = []
            if (filteredTotalPages <= 7) {
              for (let i = 1; i <= filteredTotalPages; i++) pages.push(i)
            } else {
              pages.push(1)
              if (currentPage > 3) pages.push("...")
              const start = Math.max(2, currentPage - 1)
              const end = Math.min(filteredTotalPages - 1, currentPage + 1)
              for (let i = start; i <= end; i++) pages.push(i)
              if (currentPage < filteredTotalPages - 2) pages.push("...")
              pages.push(filteredTotalPages)
            }
            return pages
          }

          const handleGoToPage = () => {
            const page = parseInt(goToPageInput, 10)
            if (!isNaN(page) && page >= 1 && page <= filteredTotalPages) {
              setCurrentPage(page)
              setGoToPageInput("")
            }
          }

          return (
            <div className="px-3 sm:px-4 py-1.5 flex flex-col items-center gap-1.5 border-t border-border bg-card bg-gray-100 dark:bg-gray-800">
              {/* Page buttons */}
              <div className="flex items-center gap-0.5 flex-wrap justify-center">
                {/* First */}
                <button
                  className="px-1 sm:px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
                {/* Previous */}
                <button
                  className="px-1 sm:px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <span className="sm:hidden">←</span>
                  <span className="hidden sm:inline">← {t("previous")}</span>
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, idx) =>
                  typeof page === "string" ? (
                    <span key={`ellipsis-${idx}`} className="px-1 py-0.5 text-[11px] text-muted-foreground select-none">…</span>
                  ) : (
                    <button
                      key={page}
                      className={`px-1.5 sm:px-2 py-0.5 text-[11px] rounded transition-colors ${
                        page === currentPage
                          ? "bg-[#662D91] text-white font-semibold"
                          : "border border-gray-300 dark:border-gray-600 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setCurrentPage(page as number)}
                    >
                      {page}
                    </button>
                  )
                )}

                {/* Next */}
                <button
                  className="px-1 sm:px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  onClick={() => setCurrentPage(Math.min(filteredTotalPages, currentPage + 1))}
                  disabled={currentPage === filteredTotalPages}
                >
                  <span className="sm:hidden">→</span>
                  <span className="hidden sm:inline">{t("next")} →</span>
                </button>
                {/* Last */}
                <button
                  className="px-1 sm:px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-600 rounded hover:bg-muted disabled:opacity-40 transition-colors"
                  onClick={() => setCurrentPage(filteredTotalPages)}
                  disabled={currentPage === filteredTotalPages}
                >
                  <ChevronsRight size={12} className="sm:w-3.5 sm:h-3.5" />
                </button>
              </div>

              {/* Go to page */}
              {filteredTotalPages > 7 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">{t("goToPage")}:</span>
                  <input
                    type="number"
                    min={1}
                    max={filteredTotalPages}
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGoToPage()}
                    className="w-14 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91] bg-background"
                  />
                  <button
                    onClick={handleGoToPage}
                    className="px-2 py-0.5 text-xs bg-[#662D91] text-white rounded hover:bg-[#532073] transition-colors"
                  >
                    {t("go")}
                  </button>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Mobile Add Icon (Positioned at bottom right of screen) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        {actionButtons.some((btn) => btn.type === "add") && (
          <ActionIconButton
            IconDefault={AddIcon1}
            IconHover={AddIcon2}
            onClick={actionButtons.find((btn) => btn.type === "add")?.onClick || (() => {})}
            title="Add"
          />
        )}
      </div>
    </div>
  )
}

// Export icon components so other modules can import them directly
export const ExcelIcon: React.ComponentType<{ className?: string }> = (props) => <ExcelIcon1 {...props} />
export const CsvIcon: React.ComponentType<{ className?: string }> = (props) => <CsvIcon1 {...props} />
export const PdfIcon: React.ComponentType<{ className?: string }> = (props) => <PdfIcon1 {...props} />