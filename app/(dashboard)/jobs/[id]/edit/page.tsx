"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import JobFormCore from "@/components/add-job-modal/JobFormCore"

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => router.push("/jobs/all")} className="hover:text-foreground transition-colors">
              {t("jobs") || "Jobs"}
            </button>
            <span>/</span>
            <button onClick={() => router.push(`/jobs/${params.id}`)} className="hover:text-foreground transition-colors">
              {t("job") || "Job"} #{params.id}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{t("edit") || "Edit"}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-card rounded-lg shadow-sm border p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">{t("editJob") || "Edit Job"}</h1>
              <p className="text-sm text-muted-foreground">
                {t("job") || "Job"} #{params.id}
              </p>
            </div>
          </div>

          {/* Form */}
          <JobFormCore
            jobId={params.id}
            mode="edit"
            onComplete={(job) => {
              router.push("/dashboard")
            }}
            onCancel={() => {
              router.push("/dashboard")
            }}
          />
        </div>
      </div>
    </div>
  )
}
