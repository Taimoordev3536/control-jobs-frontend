"use client"

import { useState } from "react"
import { Plus, Filter, FileText, Download, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"
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

export default function JobsControlPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("alerts")

  const tabs = [
    { key: "alerts", label: t("alerts") },
    { key: "signings", label: t("signings") },
    { key: "tasks", label: t("tasks") },
    { key: "surveys", label: t("surveys") },
  ]

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{t("controlCenter")}</h1>

          {/* Mobile Action Menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("add")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filter")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  {t("exportExcel")}
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
    </div>
  )
}
