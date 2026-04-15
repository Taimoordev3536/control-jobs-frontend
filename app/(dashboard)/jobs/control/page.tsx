
"use client"

import type React from "react"
import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import AddJobModal from "@/components/add-job-modal"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AnimatedLoader } from "@/components/animated-loader"

// Import tab components dynamically
const ControlAlertTab = dynamic(() => import("@/components/control-tabs/control-alert-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
  ssr: false,
})
const ControlSigningsTab = dynamic(() => import("@/components/control-tabs/control-signings-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
  ssr: false,
})
const ControlTasksTab = dynamic(() => import("@/components/control-tabs/control-tasks-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
  ssr: false,
})
const ControlSurveysTab = dynamic(() => import("@/components/control-tabs/control-surveys-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
  ssr: false,
})
const ControlManualTab = dynamic(() => import("@/components/control-tabs/control-manual-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
  ssr: false,
})

// Import SVG icons
import AddIcon1 from "../../../../icons/Controles/add1.svg"
import AddIcon2 from "../../../../icons/Controles/add2.svg"
import FilterIcon1 from "../../../../icons/Controles/filter1.svg"
import FilterIcon2 from "../../../../icons/Controles/filter2.svg"
import CsvIcon1 from "../../../../icons/Controles/csv1.svg"
import CsvIcon2 from "../../../../icons/Controles/csv2.svg"
import ExcelIcon1 from "../../../../icons/Controles/xls1.svg"
import ExcelIcon2 from "../../../../icons/Controles/xls2.svg"
import PdfIcon1 from "../../../../icons/Controles/pdf1.svg"
import PdfIcon2 from "../../../../icons/Controles/pdf2.svg"
import BriefcaseIcon from "../../../../icons/Menu/merchants.svg" 
import ClientIcon from "../../../../icons/Menu/clients.svg"
import WorkersIcon from "../../../../icons/Menu/workers.svg"
import OcupacionIcon from "../../../../icons/new/ocupacion.svg"

// ActionIconButton component
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

// MobileDropdown component
function MobileDropdown({
  actionButtons,
}: {
  actionButtons: { IconDefault: React.ComponentType<{ className?: string }>; title: string; onClick: () => void }[]
}) {
  const [open, setOpen] = useState(false)

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
          {actionButtons.map((button, index) => (
            <div
              key={index}
              onClick={() => {
                setOpen(false)
                button.onClick()
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <button.IconDefault className="w-6 h-6" />
              {button.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function JobsControlPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("alerts")
  const [showAddJobModal, setShowAddJobModal] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  // Filter states
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedClient, setSelectedClient] = useState("all")
  const [selectedJob, setSelectedJob] = useState("all")
  const [selectedWorker, setSelectedWorker] = useState("all")

  const tabs = [
    { key: "alerts", label: t("alerts") },
    { key: "signings", label: t("signings") },
    { key: "tasks", label: t("tasks") },
    { key: "surveys", label: t("surveys") },
    { key: "manual", label: t("manualAttendance") || "Manual" },
  ]

  const actionButtons = [
    {
      type: "add",
      IconDefault: AddIcon1,
      IconHover: AddIcon2,
      onClick: () => setShowAddJobModal(true),
      title: t("add") || "Add new job",
    },
    {
      type: "filter",
      IconDefault: FilterIcon1,
      IconHover: FilterIcon2,
      onClick: () => setShowFilters((v) => !v),
      title: t("filter") || "Filter",
    },
    {
      type: "pdf",
      IconDefault: PdfIcon1,
      IconHover: PdfIcon2,
      onClick: () => exportToPDF([], [], "jobs-control.pdf"),
      title: t("exportPdf") || "Export PDF",
    },
    {
      type: "excel",
      IconDefault: ExcelIcon1,
      IconHover: ExcelIcon2,
      onClick: () => exportToXLSX([], [], "jobs-control.xls"),
      title: t("exportExcel") || "Export Excel",
    },
    {
      type: "csv",
      IconDefault: CsvIcon1,
      IconHover: CsvIcon2,
      onClick: () => exportToCSV([], [], "jobs-control.csv"),
      title: t("exportCsv") || "Export CSV",
    },
  ]

  const handleJobAdded = (newJob: any) => {
    console.log("New job added:", newJob)
  }

  return (
    <div className="p-2 bg-background min-h-screen relative">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-border bg-gray-100 dark:bg-gray-800">
          <h1 className="text-2xl font-semibold text-foreground">{t("controlCenter")}</h1>
          <div className="flex items-center gap-2">
            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {actionButtons.map((button, index) => {
                const isMobileButton = ["csv", "excel", "pdf", "filter"].includes(button.type)
                return (
                  <div
                    key={index}
                    className={isMobileButton ? "hidden sm:block" : "hidden sm:flex"}
                  >
                    <ActionIconButton
                      IconDefault={button.IconDefault}
                      IconHover={button.IconHover}
                      onClick={button.onClick}
                      title={button.title}
                    />
                  </div>
                )
              })}
            </div>
            {/* Mobile Dropdown */}
            <MobileDropdown
              actionButtons={actionButtons.filter((button) =>
                ["csv", "excel", "pdf", "filter"].includes(button.type)
              )}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="p-3 border-b border-border bg-gray-50 dark:bg-gray-900">
            <Card className="w-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md" style={{ backgroundColor: '#662D91' }}>
                    <div className="h-4 w-4" style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 0.5px white)' }}>
                      <FilterIcon1 className="h-4 w-4" />
                    </div>
                  </div>
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Date Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="flex items-center gap-1.5 text-xs font-medium">
                      <OcupacionIcon className="h-3.5 w-3.5" />
                      Fecha
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full h-9 text-sm"
                    />
                  </div>

                  {/* Client/Titular Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="client" className="flex items-center gap-1.5 text-xs font-medium">
                      <ClientIcon className="h-3.5 w-3.5" />
                      Seleccionar Titular
                    </Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger id="client" className="w-full h-9 text-sm">
                        <SelectValue placeholder="Todos los Titulares" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Titulares</SelectItem>
                        <SelectItem value="client1">Client 1</SelectItem>
                        <SelectItem value="client2">Client 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="job" className="flex items-center gap-1.5 text-xs font-medium">
                      <BriefcaseIcon className="h-3.5 w-3.5" />
                      Seleccionar Job
                    </Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger id="job" className="w-full h-9 text-sm">
                        <SelectValue placeholder="Todos los Jobs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Jobs</SelectItem>
                        <SelectItem value="job1">Job Nº 1</SelectItem>
                        <SelectItem value="job2">Job Nº 2</SelectItem>
                        <SelectItem value="job3">Job Nº 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Worker Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="worker" className="flex items-center gap-1.5 text-xs font-medium">
                      <WorkersIcon className="h-3.5 w-3.5" />
                      Seleccionar Trabajador
                    </Label>
                    <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                      <SelectTrigger id="worker" className="w-full h-9 text-sm">
                        <SelectValue placeholder="Todos los Trabajadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Trabajadores</SelectItem>
                        <SelectItem value="worker1">Worker 1</SelectItem>
                        <SelectItem value="worker2">Worker 2</SelectItem>
                        <SelectItem value="worker3">Worker 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "alerts" && (
            <ControlAlertTab showFilters={showFilters} onShowFiltersChange={setShowFilters} />
          )}
          {activeTab === "signings" && (
            <ControlSigningsTab showFilters={showFilters} onShowFiltersChange={setShowFilters} />
          )}
          {activeTab === "tasks" && (
            <ControlTasksTab showFilters={showFilters} onShowFiltersChange={setShowFilters} />
          )}
          {activeTab === "surveys" && (
            <ControlSurveysTab showFilters={showFilters} onShowFiltersChange={setShowFilters} />
          )}
          {activeTab === "manual" && (
            <ControlManualTab showFilters={showFilters} onShowFiltersChange={setShowFilters} />
          )}
        </div>
      </div>

      {/* Mobile Add Icon */}
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

      {/* Add Job Modal */}
      <AddJobModal open={showAddJobModal} onOpenChange={setShowAddJobModal} onJobAdded={handleJobAdded} />
    </div>
  )
}

// Export as dynamic component to avoid SSR issues with SVG imports
export default dynamic(() => Promise.resolve(JobsControlPage), { ssr: false })