import { Suspense } from "react"
import TaskDetailView from "../../../../components/job-detail/task-detail-view"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useTranslation } from "@/hooks/use-translation"

interface TaskDetailPageProps {
  params: {
    id: string
  }
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<LoadingSpinner />}>
        <TaskDetailView taskId={params.id} />
      </Suspense>
    </div>
  )
}

export async function generateMetadata({ params }: TaskDetailPageProps) {
  return {
    title: `Task Details - ${params.id}`,
    description: `View and manage task details for task ${params.id}`,
  }
}
