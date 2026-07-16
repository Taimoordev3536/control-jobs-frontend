"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate, formatLocalTime } from "@/lib/datetime"

interface ClientSolicitudesTabProps {
  clientId: string
}

const statusStyle = (s: string) =>
  ({
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  } as Record<string, string>)[s] || "bg-gray-100 text-gray-600"

export function ClientSolicitudesTab({ clientId }: ClientSolicitudesTabProps) {
  const { t } = useTranslation()
  const { status } = useSession()

  const typeLabel = (v: string) =>
    ({
      FULL_DAY: t("reqFullDay") || "Día completo",
      CHECK_IN_ONLY: t("reqCheckIn") || "Solo entrada",
      CHECK_OUT_ONLY: t("reqCheckOut") || "Solo salida",
      EDIT_EXISTING: t("reqEdit") || "Editar fichaje",
    } as Record<string, string>)[v] || v

  const statusLabel = (v: string) =>
    ({
      PENDING: t("pending") || "Pendiente",
      APPROVED: t("approved") || "Aprobada",
      REJECTED: t("rejected") || "Rechazada",
      CANCELLED: t("cancelled") || "Cancelada",
    } as Record<string, string>)[v] || v

  const columns = [
    { key: "requestedDate", label: t("date") || "Fecha", render: (v: string) => formatLocalDate(v) || "—" },
    { key: "worker", label: t("worker") || "Trabajador", render: (_v: any, row: any) => row.worker?.user?.name || row.worker?.code || "—" },
    { key: "requestType", label: t("type") || "Tipo", render: (v: string) => typeLabel(v) },
    { key: "requestedCheckIn", label: t("alertSignIn") || "Entrada", render: (v: string) => (v ? formatLocalTime(v) : "—") },
    { key: "requestedCheckOut", label: t("alertSignOut") || "Salida", render: (v: string) => (v ? formatLocalTime(v) : "—") },
    {
      key: "status",
      label: t("status") || "Estado",
      align: "center" as const,
      render: (v: string) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(v)}`}>
          {statusLabel(v)}
        </span>
      ),
    },
  ]

  const { data = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["manual-attendance", "requests", "client", clientId],
    queryFn: async () => {
      const j = await apiFetch<any>(`/manual-attendance/requests?clientId=${clientId}`)
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: status === "authenticated" && !!clientId,
  })

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noRequestsYet") || "No requests yet"} />
}
