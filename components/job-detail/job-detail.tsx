"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { MoreVertical } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import dynamic from "next/dynamic"
import { AnimatedLoader } from "@/components/animated-loader"

// Import tab components dynamically
const AttendanceTab = dynamic(() => import("../job-attendance-detail"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const TasksTab = dynamic(() => import("./tasks"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const JobScheduleTab = dynamic(() => import("./job-schedule"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const SurveysTab = dynamic(() => import("./surveys"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})

// Import SVG icons
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
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close on click/tap outside or Escape (previously it only closed by tapping
  // the ⋮ button again).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="relative sm:hidden" ref={menuRef}>
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

interface JobDetailProps {
  jobId: string
  jobData?: any
  onClose?: () => void
}

export default function JobDetail({ jobId, jobData, onClose }: JobDetailProps) {
  const { t } = useTranslation("job-detail")
  const [activeTab, setActiveTab] = useState("attendance")

  const tabs = [
    { key: "attendance", label: t("attendance") },
    { key: "tasks", label: t("tasks") },
    { key: "job-schedule", label: t("jobSchedule") },
    { key: "surveys", label: t("surveys") },
  ]

  const actionButtons = [
    {
      type: "add",
      IconDefault: AddIcon1,
      IconHover: AddIcon2,
      onClick: () => console.log("Add clicked"),
      title: t("add"),
    },
    {
      type: "filter",
      IconDefault: FilterIcon1,
      IconHover: FilterIcon2,
      onClick: () => console.log("Filter clicked"),
      title: t("filter"),
    },
    {
      type: "pdf",
      IconDefault: PdfIcon1,
      IconHover: PdfIcon2,
      onClick: () => console.log("Export PDF clicked"),
      title: t("exportPdf"),
    },
    {
      type: "excel",
      IconDefault: ExcelIcon1,
      IconHover: ExcelIcon2,
      onClick: () => console.log("Export Excel clicked"),
      title: t("exportExcel"),
    },
    {
      type: "csv",
      IconDefault: CsvIcon1,
      IconHover: CsvIcon2,
      onClick: () => console.log("Export CSV clicked"),
      title: t("exportCsv"),
    },
  ]

  return (
    <div className="p-2 bg-background min-h-screen relative">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center p-2 border-b border-border bg-gray-100 dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-foreground">
              {t("jobDetails")} - {jobData?.title || jobId}
            </h1>
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2">
              {actionButtons.map((button, index) => {
                const isMobileButton = ["csv", "excel", "pdf", "filter"].includes(button.type)
                return (
                  <div key={index} className={isMobileButton ? "hidden sm:block" : "hidden sm:flex"}>
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
              actionButtons={actionButtons.filter((button) => ["csv", "excel", "pdf", "filter"].includes(button.type))}
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

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === "attendance" && <AttendanceTab jobId={jobId} jobData={jobData} />}
          {activeTab === "tasks" && <TasksTab jobId={jobId} jobData={jobData} />}
          {activeTab === "job-schedule" && <JobScheduleTab jobId={jobId} jobData={jobData} />}
          {activeTab === "surveys" && <SurveysTab jobId={jobId} jobData={jobData} />}
        </div>
      </div>

      {/* Mobile Add Icon */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        {actionButtons.some((btn) => btn.type === "add") && (
          <ActionIconButton
            IconDefault={AddIcon1}
            IconHover={AddIcon2}
            onClick={actionButtons.find((btn) => btn.type === "add")?.onClick || (() => {})}
            title={t("add")}
          />
        )}
      </div>
    </div>
  )
}
