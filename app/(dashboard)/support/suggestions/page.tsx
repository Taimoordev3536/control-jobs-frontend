"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

export default function SupportSuggestionsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const { data: suggestions = [], isLoading } = useQuery<any[]>({
    queryKey: ["support", "suggestions"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/support/suggestions")
      return (data.data || []).map((r: any) => ({
        id: r.publicId || r.id,
        date: formatLocalDateTime(r.createdAt),
        requester: r.requesterName || "-",
        role: r.requesterRole || "-",
        message: r.message || "-",
      }))
    },
    enabled: isAuthenticated,
  })

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "requester", label: t("requester"), sortable: true },
    { key: "role", label: t("role"), sortable: true },
    { key: "message", label: t("message"), sortable: false },
  ]

  return (
    <DataListTemplate
      title={t("suggestions")}
      data={suggestions}
      columns={columns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noSuggestionsFound") || "No suggestions found"}
    />
  )
}
