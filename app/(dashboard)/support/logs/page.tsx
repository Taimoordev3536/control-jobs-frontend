"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

export default function SupportLogsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["logs"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/logs")
      return (data.data || []).map((r: any) => ({
        id: r.publicId || r.id,
        date: formatLocalDateTime(r.createdAt),
        actor: r.actorName || "-",
        action: r.action || "-",
        detail: r.detail || "-",
      }))
    },
    enabled: isAuthenticated,
  })

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "actor", label: t("requester"), sortable: true },
    { key: "action", label: t("action") || "Action", sortable: true },
    { key: "detail", label: t("message"), sortable: false },
  ]

  return (
    <DataListTemplate
      title={t("logs")}
      data={logs}
      columns={columns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noLogsFound") || "No logs found"}
    />
  )
}
