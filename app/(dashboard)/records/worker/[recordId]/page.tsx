"use client"

import { useParams } from "next/navigation"
import RecordDetail from "@/components/records/record-detail"

export default function WorkerRecordDetailPage() {
  const params = useParams()
  const recordId = String((params as any)?.recordId || "")
  return <RecordDetail recordId={recordId} backHref="/records/worker" />
}
