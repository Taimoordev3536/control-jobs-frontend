"use client"

import { useParams } from "next/navigation"
import JobDetailView from "@/components/job-detail/job-detail-view"

export default function JobDetailPage() {
  const params = useParams()
  const id = String((params as any)?.id || "")
  return <JobDetailView jobId={id} backHref="/jobs/all" />
}
