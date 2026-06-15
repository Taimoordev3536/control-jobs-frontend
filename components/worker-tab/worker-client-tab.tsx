"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface WorkerClientTabProps {
  workerId: string
}

export function WorkerClientTab({ workerId }: WorkerClientTabProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "responsible", label: t("responsible"), sortable: true },
    { key: "mobile", label: t("mobile"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
  ]

  useEffect(() => {
    if (!session?.accessToken || !workerId) return
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}/clients`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((j) => setData(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [session?.accessToken, workerId])

  return <TabTableTemplate columns={columns} data={data} loading={loading} emptyMessage={t("noCustomersAvailable")} />
}
