import { Suspense } from "react"
import JobDetailView from "@/components/job-detail-view"
import { LoadingSpinner } from "@/components/loading-spinner"

interface JobDetailPageProps {
  params: {
    id: string
  }
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <JobDetailView jobId={params.id} />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: JobDetailPageProps) {
  return {
    title: `Job Details - ${params.id}`,
    description: `View and manage job details for job ${params.id}`,
  }
}
