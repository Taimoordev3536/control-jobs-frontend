"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import AddJobModal from "@/components/add-job-modal/main"

// Add icon component
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

// ActionIconButton component to handle hover state
function ActionIconButton({
  IconDefault,
  IconHover,
  onClick,
  title,
}: {
  IconDefault: React.ComponentType
  IconHover: React.ComponentType
  onClick: () => void
  title: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-2 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors"
      title={title}
    >
      {isHovered ? <IconHover /> : <IconDefault />}
    </button>
  )
}

export default function AllJobsPage() {
  const { t } = useTranslation()
  const [showAddJobModal, setShowAddJobModal] = useState(false)

  const handleJobAdded = (newJob: any) => {
    console.log("New job added:", newJob)
    // You can add logic here to refresh the jobs list or show a success message
  }

  return (
    <div className="p-2 bg-background min-h-screen relative">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border bg-gray-100 dark:bg-gray-800">
          <h1 className="text-2xl font-semibold text-foreground">{t("allJobs") || "All Jobs"}</h1>
          <div className="flex items-center gap-2">
            {/* Desktop Add Button */}
            <div className="hidden sm:block">
              <ActionIconButton
                IconDefault={AddIcon1}
                IconHover={AddIcon2}
                onClick={() => setShowAddJobModal(true)}
                title={t("add") || "Add new job"}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <p className="text-muted-foreground">
            {t("jobsListWillAppearHere") || "Jobs list will appear here..."}
          </p>
          {/* Add your jobs table/list component here */}
        </div>
      </div>

      {/* Mobile Add Button (Floating) */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <ActionIconButton
          IconDefault={AddIcon1}
          IconHover={AddIcon2}
          onClick={() => setShowAddJobModal(true)}
          title={t("add") || "Add"}
        />
      </div>

      {/* Add Job Modal */}
      <AddJobModal 
        open={showAddJobModal} 
        onOpenChange={setShowAddJobModal} 
        onJobAdded={handleJobAdded} 
      />
    </div>
  )
}
