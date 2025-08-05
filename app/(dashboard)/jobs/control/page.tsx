"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Filter, FileText, Download, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"
import AddJobModal from "@/components/add-job-modal"
import dynamic from "next/dynamic"

// Import tab components dynamically
const ControlAlertTab = dynamic(() => import("@/components/control-tabs/control-alert-tab"), {
  loading: () => <div className="p-6 text-muted-foreground">{/* Loading... */}</div>,
})
const ControlSigningsTab = dynamic(() => import("@/components/control-tabs/control-signings-tab"), {
  loading: () => <div className="p-6 text-muted-foreground">{/* Loading... */}</div>,
})
const ControlTasksTab = dynamic(() => import("@/components/control-tabs/control-tasks-tab"), {
  loading: () => <div className="p-6 text-muted-foreground">{/* Loading... */}</div>,
})
const ControlSurveysTab = dynamic(() => import("@/components/control-tabs/control-surveys-tab"), {
  loading: () => <div className="p-6 text-muted-foreground">{/* Loading... */}</div>,
})

// Action button icons
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

// ActionIconButton component to handle hover state for icons
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
      className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md border border-purple-200 dark:border-purple-800 transition-colors"
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? <IconHover className="w-5 h-5" /> : <IconDefault className="w-5 h-5" />}
    </button>
  )
}

export default function JobsControlPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("alerts")
  const [showAddJobModal, setShowAddJobModal] = useState(false)

  const tabs = [
    { key: "alerts", label: t("alerts") },
    { key: "signings", label: t("signings") },
    { key: "tasks", label: t("tasks") },
    { key: "surveys", label: t("surveys") },
  ]

  const handleAddJob = () => {
    setShowAddJobModal(true)
  }

  const handleFilter = () => {
    // Handle filter action
    console.log("Filter clicked")
  }

  const handleExportPdf = () => {
    // Handle PDF export
    console.log("Export PDF clicked")
  }

  const handleExportXls = () => {
    // Handle Excel export
    console.log("Export Excel clicked")
  }

  const handleExportCsv = () => {
    // Handle CSV export
    console.log("Export CSV clicked")
  }

  const handleJobAdded = (newJob: any) => {
    // Handle new job added
    console.log("New job added:", newJob)
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{t("controlCenter")}</h1>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <ActionIconButton
              IconDefault={AddIcon1}
              IconHover={AddIcon2}
              onClick={handleAddJob}
              title={t("add") || "Add new job"}
            />
            <ActionIconButton
              IconDefault={FilterIcon1}
              IconHover={FilterIcon2}
              onClick={handleFilter}
              title={t("filter") || "Filter"}
            />
            <ActionIconButton
              IconDefault={PdfIcon1}
              IconHover={PdfIcon2}
              onClick={handleExportPdf}
              title={t("exportPdf") || "Export PDF"}
            />
            <ActionIconButton
              IconDefault={XlsIcon1}
              IconHover={XlsIcon2}
              onClick={handleExportXls}
              title={t("exportExcel") || "Export Excel"}
            />
            <ActionIconButton
              IconDefault={CsvIcon1}
              IconHover={CsvIcon2}
              onClick={handleExportCsv}
              title={t("exportCsv") || "Export CSV"}
            />
          </div>

          {/* Mobile Action Menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddJob}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("add")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFilter}>
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filter")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPdf}>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportXls}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("exportExcel")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  {t("exportCsv")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-border">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Tabs - Horizontal Scroll */}
        <div className="sm:hidden border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] bg-card">
        {activeTab === "alerts" && <ControlAlertTab />}
        {activeTab === "signings" && <ControlSigningsTab />}
        {activeTab === "tasks" && <ControlTasksTab />}
        {activeTab === "surveys" && <ControlSurveysTab />}
      </div>

      {/* Add Job Modal */}
      <AddJobModal open={showAddJobModal} onOpenChange={setShowAddJobModal} onJobAdded={handleJobAdded} />
    </div>
  )
}
