"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface ClientWorkerTabProps {
  clientId: string
}

interface ConnectedWorker {
  id: number
  publicId: string
  code?: string
  name: string | null
  occupation: string | null
  mobile: string | null
  city: string | null
  postalCode: string | null
  logoUrl?: string | null
}

// "Workers" tab on the Client detail page. These workers are NOT owned by
// the client — they're the workers assigned to any of the client's jobs.
// The same worker may show up under multiple clients (e.g. assigned to jobs
// from different clients). Read-only; informational.
export function ClientWorkerTab({ clientId }: ClientWorkerTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()

  // Mirror the sidebar Workers list behavior: clicking a row navigates to
  // /workers/[publicId] which renders the worker detail tabs (Data, Calendar,
  // Jobs, Clients, Messages). The route accepts the worker's publicId UUID,
  // not the numeric id.
  const handleRowClick = (row: ConnectedWorker) => {
    if (!row?.publicId) return
    const qs = row.name ? `?name=${encodeURIComponent(row.name)}` : ""
    router.push(`/workers/${row.publicId}${qs}`)
  }

  const { data: workers = [], isLoading } = useQuery<ConnectedWorker[]>({
    queryKey: ["worker", "by-client", clientId],
    enabled: !!clientId && !!session?.accessToken,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/by-client/${clientId}`,
        { headers: { Authorization: `Bearer ${session!.accessToken}` } },
      )
      if (!res.ok) return []
      const result = await res.json()
      return Array.isArray(result?.data) ? result.data : []
    },
  })

  // Pixel widths (not %): with the table's fixed layout the table width becomes
  // their sum, so on a phone it grows past the viewport and scrolls horizontally
  // (columns stay readable) instead of cramming/overlapping into 100% width.
  const columns: TabTableColumn[] = [
    { key: "name", label: t("name"), sortable: true, width: "170px" },
    { key: "occupation", label: t("occupation"), sortable: true, width: "140px" },
    { key: "mobile", label: t("mobile"), sortable: true, width: "140px" },
    { key: "city", label: t("locality"), sortable: true, width: "140px" },
    { key: "postalCode", label: t("postalCode"), sortable: true, align: "center", width: "120px" },
  ]

  return (
    <TabTableTemplate
      columns={columns}
      data={workers}
      loading={isLoading}
      emptyMessage={t("noDataAvailableInTable")}
      onRowClick={handleRowClick}
    />
  )
}
