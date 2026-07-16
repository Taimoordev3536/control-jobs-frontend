"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface WorkerClientTabProps {
  workerId: string
}

export function WorkerClientTab({ workerId }: WorkerClientTabProps) {
  const { t } = useTranslation()
  const { status } = useSession()

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "responsible", label: t("responsible"), sortable: true },
    { key: "mobile", label: t("mobile"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
  ]

  const { data = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["worker", workerId, "clients"],
    queryFn: async () => {
      const j = await apiFetch<any>(`/worker/${workerId}/clients`)
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: status === "authenticated" && !!workerId,
  })

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noCustomersAvailable")} />
}
