import { Suspense } from "react"
import WorkCenterDetailView from "@/components/work-center-tabs/work-center-detail-view"
import { LoadingSpinner } from "@/components/loading-spinner"

interface WorkCenterPageProps {
  params: {
    id: string
  }
}

export default function WorkCenterPage({ params }: WorkCenterPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <WorkCenterDetailView workCenterId={params.id} />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: WorkCenterPageProps) {
  return {
    title: `Centro de trabajo - ${params.id}`,
    description: `View and manage work center details for work center ${params.id}`,
  }
}
