"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface WorkerJobsTabProps {
  workerId: string
}

export function WorkerJobsTab({ workerId }: WorkerJobsTabProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const columns = [
    { key: "holder", label: t("holder"), sortable: true },
    { key: "denomination", label: t("denomination"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
  ]

  useEffect(() => {
    if (!session?.accessToken || !workerId) return
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}/jobs`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((j) => setData(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [session?.accessToken, workerId])

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noJobsAvailable")} />
}
