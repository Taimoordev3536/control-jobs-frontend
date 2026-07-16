"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Eye, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(n || 0).toFixed(2)} €`

export default function MyClientInvoicesPage() {
  const { t } = useTranslation()
  const { data: session, status } = useSession()
  const [selected, setSelected] = useState<any | null>(null)

  const { data: invoices = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["client", "me", "invoices"],
    queryFn: async () => {
      const j = await apiFetch<any>("/client/me/invoices")
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: status === "authenticated",
  })

  const openPdf = async (id: string) => {
    if (!session?.accessToken) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/me/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }


  const columns = [
    { key: "invoiceNumber", label: t("number") || "Nº", render: (v: string) => v || "—" },
    { key: "periodStart", label: t("period") || "Periodo", render: (_v: any, row: any) => `${formatLocalDate(row.periodStart)} – ${formatLocalDate(row.periodEnd)}` },
    { key: "subtotal", label: t("subtotal") || "Base", align: "right" as const, render: (v: number) => eur(v) },
    { key: "total", label: t("total") || "Total", align: "right" as const, render: (v: number) => eur(v) },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (_v: any, row: any) => (
        <button onClick={() => setSelected(row)} title={t("view") || "View"} className="p-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950">
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ]

  if (loading) return <div className="w-full p-6 flex justify-center"><AnimatedLoader /></div>

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("myInvoices") || "Mis facturas"}</h1>
      <TabTableTemplate columns={columns} data={invoices} loading={false} emptyMessage={t("noInvoicesYet") || "No invoices yet"} />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{t("invoice") || "Factura"} · {selected?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{formatLocalDate(selected.periodStart)} – {formatLocalDate(selected.periodEnd)}</div>
              <div className="rounded-md border border-border divide-y divide-border">
                {selected.fixedAmount != null && (
                  <div className="flex justify-between px-3 py-2"><span>{selected.fixedLabel}</span><span>{eur(selected.fixedAmount)}</span></div>
                )}
                <div className="flex justify-between px-3 py-2"><span>{selected.hoursLabel} ({selected.hoursQty} × {eur(selected.hourRate)})</span><span>{eur(selected.hoursAmount)}</span></div>
                <div className="flex justify-between px-3 py-2"><span>{t("subtotal") || "Base imponible"}</span><span>{eur(selected.subtotal)}</span></div>
                <div className="flex justify-between px-3 py-2"><span>IVA ({selected.vatPct}%)</span><span>{eur(selected.vatAmount)}</span></div>
                <div className="flex justify-between px-3 py-2 font-semibold"><span>{t("total") || "Total"}</span><span>{eur(selected.total)}</span></div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => selected && openPdf(selected.id)}><Printer className="h-4 w-4 mr-1" />PDF</Button>
            <Button onClick={() => setSelected(null)} className="bg-[#662D91] hover:bg-[#532073] text-white">{t("close") || "Cerrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
