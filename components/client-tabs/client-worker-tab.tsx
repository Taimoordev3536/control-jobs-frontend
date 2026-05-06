"use client"

import { useState, useEffect } from "react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [workers, setWorkers] = useState<ConnectedWorker[]>([])

  // Mirror the sidebar Workers list behavior: clicking a row navigates to
  // /workers/[publicId] which renders the worker detail tabs (Data, Calendar,
  // Jobs, Clients, Messages). The route accepts the worker's publicId UUID,
  // not the numeric id.
  const handleRowClick = (row: ConnectedWorker) => {
    if (!row?.publicId) return
    const qs = row.name ? `?name=${encodeURIComponent(row.name)}` : ""
    router.push(`/workers/${row.publicId}${qs}`)
  }

  useEffect(() => {
    if (!clientId || !session?.accessToken) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/by-client/${clientId}`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        )
        if (!res.ok) {
          if (!cancelled) setWorkers([])
          return
        }
        const result = await res.json()
        const data: ConnectedWorker[] = Array.isArray(result?.data) ? result.data : []
        if (!cancelled) setWorkers(data)
      } catch {
        if (!cancelled) setWorkers([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [clientId, session?.accessToken])

  const columns: TabTableColumn[] = [
    { key: "name", label: t("name"), sortable: true, width: "35%" },
    { key: "occupation", label: t("occupation"), sortable: true, width: "20%" },
    { key: "mobile", label: t("mobile"), sortable: true, width: "13%" },
    { key: "city", label: t("locality"), sortable: true, width: "20%" },
    { key: "postalCode", label: t("postalCode"), sortable: true, align: "center", width: "12%" },
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
