"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Eye, Printer } from "lucide-react"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(".", ",")} €`

export default function MyInvoicesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session } = useSession()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const openPdf = async (publicId: string) => {
    if (!session?.accessToken) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices/${publicId}/pdf`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices?pageSize=100`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => setInvoices(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const statusMeta = (v: string) =>
    ({
      PENDING: { label: t("pending") || "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      PAID: { label: t("paid") || "Pagada", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      CANCELLED: { label: t("cancelled") || "Cancelada", color: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    } as Record<string, { label: string; color: string }>)[v] || { label: v, color: "bg-muted text-muted-foreground" }

  const columns = [
    { key: "issueDate", label: t("date") || "Fecha", render: (v: string) => formatLocalDate(v) },
    { key: "invoiceNumber", label: t("invoiceNo") || "Nº Factura", render: (v: string) => v || "—" },
    { key: "total", label: t("total") || "Total", align: "right" as const, render: (v: number) => eur(v) },
    {
      key: "status",
      label: t("status") || "Estado",
      align: "center" as const,
      render: (v: string) => {
        const m = statusMeta(v)
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.color}`}>{m.label}</span>
      },
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (_v: any, row: any) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => router.push(`/invoices/${row.publicId}`)} title={t("view") || "View"} className="p-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => openPdf(row.publicId)} title="PDF" className="p-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950">
            <Printer className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) return <div className="w-full p-6 flex justify-center"><AnimatedLoader /></div>

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("myInvoices") || "Mis facturas"}</h1>
      <p className="text-sm text-muted-foreground">{t("myInvoicesHint") || "Facturas emitidas por ControlJobs por el servicio de la plataforma."}</p>
      <TabTableTemplate columns={columns} data={invoices} loading={false} emptyMessage={t("noInvoicesYet") || "No invoices yet"} />
    </div>
  )
}
