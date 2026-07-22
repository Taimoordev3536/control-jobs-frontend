"use client"

import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import JobFormCore from "@/components/add-job-modal/JobFormCore"

export default function EditJobPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { t } = useTranslation("employer-dashboard")

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      {/* <div className="border-b bg-card">
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
      </div> */}

      {/* Main Content — tighter padding on phones so the inner form keeps its
          width; the desktop p-6 is preserved from sm up. */}
      <div className="flex justify-center px-2 sm:px-4 py-4">
        <div className="bg-card rounded-lg shadow-sm border pt-2 p-3 sm:p-6 w-full max-w-[50rem]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-semibold text-center">{t("editJob") || "Edit Job"}</h1>
              <p className="text-sm text-muted-foreground text-center">
                {/* {t("job") || "Job"} #{params.id} */}
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <X className="w-5 h-5" />
              </Button>
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
