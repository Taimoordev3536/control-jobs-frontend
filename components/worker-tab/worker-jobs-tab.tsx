"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface WorkerJobsTabProps {
  workerId: string
}

export function WorkerJobsTab({ workerId }: WorkerJobsTabProps) {
  const { t } = useTranslation()
  const { status } = useSession()

  const columns = [
    { key: "holder", label: t("holder"), sortable: true },
    { key: "denomination", label: t("denomination"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
  ]

  const { data = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["worker", workerId, "jobs"],
    queryFn: async () => {
      const j = await apiFetch<any>(`/worker/${workerId}/jobs`)
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: status === "authenticated" && !!workerId,
  })

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noJobsAvailable")} />
}
