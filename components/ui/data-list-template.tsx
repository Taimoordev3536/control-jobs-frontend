"use client"

import type React from "react"

import { useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"

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

// Default action button icons
const ExcelIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8" />
  </svg>
)

const CsvIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
)

const PdfIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
)

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
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)

  const total = totalRecords || data.length
  const totalPages = Math.ceil(total / itemsPerPage)

  const handleSort = (column: string) => {
    const columnConfig = columns.find((col) => col.key === column)
    if (!columnConfig?.sortable) return

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
          className={`text-muted-foreground ${sortColumn === column && sortDirection === "asc" ? "text-purple-600" : ""}`}
        />
        <ChevronDown
          size={14}
          className={`text-muted-foreground -mt-1 ${sortColumn === column && sortDirection === "desc" ? "text-purple-600" : ""}`}
        />
      </div>
    )
  }

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

  if (isLoading) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  // ActionIconButton component to handle hover state for icons
  function ActionIconButton({
    IconDefault,
    IconHover,
    onClick,
    title
  }: {
    IconDefault: React.ComponentType<{ className?: string }>,
    IconHover: React.ComponentType<{ className?: string }>,
    onClick: () => void,
    title: string
  }) {
    const [hovered, setHovered] = useState(false);
    return (
      <button
        onClick={onClick}
        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800 transition-colors"
        title={title}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? <IconHover className="w-5 h-5" /> : <IconDefault className="w-5 h-5" />}
      </button>
    );
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {actionButtons.length > 0 && (
            <div className="flex items-center gap-2">
              {actionButtons.map((button, index) => {
                let IconDefault = AddIcon1;
                let IconHover = AddIcon2;
                if (button.title.toLowerCase().includes("filter")) {
                  IconDefault = FilterIcon1;
                  IconHover = FilterIcon2;
                } else if (button.title.toLowerCase().includes("csv")) {
                  IconDefault = CsvIcon1;
                  IconHover = CsvIcon2;
                } else if (button.title.toLowerCase().includes("excel")) {
                  IconDefault = ExcelIcon1;
                  IconHover = ExcelIcon2;
                } else if (button.title.toLowerCase().includes("pdf")) {
                  IconDefault = PdfIcon1;
                  IconHover = PdfIcon2;
                }
                return (
                  <ActionIconButton
                    key={index}
                    IconDefault={IconDefault}
                    IconHover={IconHover}
                    onClick={button.onClick}
                    title={button.title}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Table */}
        {data.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-lg">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-6 py-4 text-sm font-semibold text-foreground transition-colors ${getAlignmentClass(
                        column.align,
                      )} ${column.sortable ? "cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50" : ""}`}
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
                {data.map((row, index) => (
                  <tr
                    key={row.id || index}
                    onClick={() => handleRowClick(row)}
                    className={`
                      border-b border-border transition-colors
                      ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      ${onRowClick ? "cursor-pointer hover:bg-muted/50 active:bg-muted/70" : ""}
                    `}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${row.id || index}-${column.key}`}
                        className={`px-6 py-4 text-sm ${
                          column.key === columns[0].key ? "text-foreground font-medium" : "text-muted-foreground"
                        } ${getAlignmentClass(column.align)}`}
                      >
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {showPagination && data.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-card">
            <div className="text-sm text-muted-foreground">
              {t("showingRecords", {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, total),
                total: total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                {t("back")}
              </button>
              <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
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
    </div>
  )
}

// Export commonly used icons for convenience
export { ExcelIcon, CsvIcon, PdfIcon }
