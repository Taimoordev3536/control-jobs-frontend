"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { ChevronUp, ChevronDown, MoreVertical } from "lucide-react"
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
  render?: (value: any, row: any) => React.ReactNode
}

interface ActionButton {
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  title: string
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
  emptyMessage?: string
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
}: DataListTemplateProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [localColumns, setLocalColumns] = useState(columns)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)

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
          : bValue.localeCompare(aValue)
      }

      return sortDirection === "asc"
        ? aValue - bValue || 0
        : bValue - aValue || 0
    })
  }, [data, sortColumn, sortDirection, localColumns])

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
            ? "text-[#662D91] font-bold" // Added font-bold for bold style
            : "text-muted-foreground"
        }`}
        strokeWidth={sortColumn === column && sortDirection === "asc" ? 3 : 2} // Increased strokeWidth for bold effect
      />
      <ChevronDown
        size={17}
        className={`-mt-1 ${
          sortColumn === column && sortDirection === "desc"
            ? "text-[#662D91] font-bold" // Added font-bold for bold style
            : "text-muted-foreground"
        }`}
        strokeWidth={sortColumn === column && sortDirection === "desc" ? 3 : 2} // Increased strokeWidth for bold effect
      />
    </div>
  )

  const handleRowClick = (row: any) => {
    if (onRowClick && row.id) {
      onRowClick(row.id)
    }
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
        className="p-2 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800 transition-colors"
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? <IconHover className="w-7 h-7" /> : <IconDefault className="w-7 h-7" />}
      </button>
    )
  }

  function MobileDropdown({ actionButtons }: { actionButtons: ActionButton[] }) {
    const [open, setOpen] = useState(false)

    const getIcons = (title: string) => {
      const lower = title.toLowerCase()
      if (lower.includes("csv")) return { IconDefault: CsvIcon1, IconHover: CsvIcon2 }
      if (lower.includes("excel")) return { IconDefault: ExcelIcon1, IconHover: ExcelIcon2 }
      if (lower.includes("pdf")) return { IconDefault: PdfIcon1, IconHover: PdfIcon2 }
      if (lower.includes("filter")) return { IconDefault: FilterIcon1, IconHover: FilterIcon2 }
      return { IconDefault: AddIcon1, IconHover: AddIcon2 }
    }

    const mobileButtons = actionButtons.filter((button) => {
      const lowerTitle = button.title.toLowerCase()
      return ["csv", "excel", "pdf", "filter"].some((type) => lowerTitle.includes(type))
    })

    return (
      <div className="relative sm:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800"
        >
          <MoreVertical className="w-7 h-7" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded shadow-lg z-50 w-40">
            {mobileButtons.map((button, index) => {
              const { IconDefault } = getIcons(button.title)
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
    <div className="p-6 bg-background min-h-screen relative">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border bg-gray-100 dark:bg-gray-800">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-2">
            {actionButtons.length > 0 && (
              <>
                {/* Desktop and Tablet Buttons */}
                <div className="flex items-center gap-2 sm:flex">
                  {actionButtons.map((button, index) => {
                    const lowerTitle = button.title.toLowerCase()
                    const isMobileButton = ["csv", "excel", "pdf", "filter"].some((type) => lowerTitle.includes(type))

                    let IconDefault = AddIcon1
                    let IconHover = AddIcon2
                    if (lowerTitle.includes("filter")) {
                      IconDefault = FilterIcon1
                      IconHover = FilterIcon2
                    } else if (lowerTitle.includes("csv")) {
                      IconDefault = CsvIcon1
                      IconHover = CsvIcon2
                    } else if (lowerTitle.includes("excel")) {
                      IconDefault = ExcelIcon1
                      IconHover = ExcelIcon2
                    } else if (lowerTitle.includes("pdf")) {
                      IconDefault = PdfIcon1
                      IconHover = PdfIcon2
                    }

                    return (
                      <div key={index} className={isMobileButton ? "hidden sm:block" : "hidden sm:flex"}>
                        <ActionIconButton
                          IconDefault={IconDefault}
                          IconHover={IconHover}
                          onClick={button.onClick}
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
        {sortedData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-lg">{emptyMessage}</p>
          </div>
        ) : (
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
                                className={`px-6 py-4 text-sm font-semibold text-foreground transition-colors cursor-move ${
                                  snapshot.isDragging ? "bg-purple-200 dark:bg-purple-800" : ""
                                } ${getAlignmentClass(column.align)} ${
                                  column.sortable ? "hover:bg-purple-100 dark:hover:bg-purple-900/50" : ""
                                }`}
                                onClick={() => column.sortable && handleSort(column.key)}
                              >
                                <div className="flex items-center justify-start">
                                  {column.label}
                                  {column.sortable && getSortIcon(column.key)}
                                </div>
                              </th>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </tr>
                    )}
                  </Droppable>
                </thead>
                <tbody>
                  {sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((row, index) => (
                    <tr
                      key={row.id || index}
                      onClick={() => handleRowClick(row)}
                      className={`border-b border-border transition-colors ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      } ${onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : ""}`}
                    >
                      {localColumns.map((column) => (
                        <td
                          key={`${row.id || index}-${column.key}`}
                          className={`px-6 py-4 text-sm ${
                            column.key === localColumns[0].key ? "text-foreground font-medium" : "text-muted-foreground"
                          } ${getAlignmentClass(column.align)}`}
                        >
                          {column.render ? column.render(row[column.key], row) : row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </DragDropContext>
          </div>
        )}

        {/* Pagination */}
        {showPagination && sortedData.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-card bg-gray-100 dark:bg-gray-800">
            <div className="text-sm text-muted-foreground">
              {t("showingRecordsFrom")} {((currentPage - 1) * itemsPerPage + 1)} {t("to")} {Math.min(currentPage * itemsPerPage, total)} {t("outOfTotal")} {total} {t("records")}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t("back")}
              </button>

              <button className="px-3 py-1 text-sm bg-[#662D91] text-white rounded-md hover:bg-[#532073] transition-colors">
                {currentPage}
              </button>

              <button
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                {t("next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Add Icon (Positioned at bottom right of screen) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        {actionButtons.some((btn) => !["csv", "excel", "pdf", "filter"].some((type) => btn.title.toLowerCase().includes(type))) && (
          <ActionIconButton
            IconDefault={AddIcon1}
            IconHover={AddIcon2}
            onClick={actionButtons.find((btn) => !["csv", "excel", "pdf", "filter"].some((type) => btn.title.toLowerCase().includes(type)))?.onClick || (() => {})}
            title="Add"
          />
        )}
      </div>
    </div>
  )
}