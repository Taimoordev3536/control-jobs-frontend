"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Download, FileText, Eye, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(n || 0).toFixed(2)} €`
const fmtSize = (b?: number | null) => {
  if (!b) return ""
  const kb = b / 1024
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
}
const downloadUrl = (url: string) => (url.includes("/upload/") ? url.replace("/upload/", "/upload/fl_attachment/") : url)

export default function MySalariesPage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [docs, setDocs] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)

  const openPdf = async (id: string) => {
    if (!session?.accessToken) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/me/salaries/${id}/pdf`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  useEffect(() => {
    if (!session?.accessToken) return
    const h = { Authorization: `Bearer ${session.accessToken}` }
    const base = process.env.NEXT_PUBLIC_API_BASE_URL
    setLoading(true)
    Promise.all([
      fetch(`${base}/worker/me/documents`, { headers: h }).then((r) => r.json()),
      fetch(`${base}/worker/me/salaries`, { headers: h }).then((r) => r.json()),
    ])
      .then(([d, s]) => {
        setDocs(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [])
        setReceipts(Array.isArray(s?.data) ? s.data : Array.isArray(s) ? s : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const columns = [
    { key: "receiptNumber", label: t("number") || "Nº", render: (v: string) => v || "—" },
    { key: "periodStart", label: t("period") || "Periodo", render: (_v: any, row: any) => `${formatLocalDate(row.periodStart)} – ${formatLocalDate(row.periodEnd)}` },
    { key: "hoursQty", label: t("hours") || "Horas", align: "center" as const, render: (v: number) => v ?? 0 },
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
    <div className="w-full p-6 bg-background min-h-screen space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("documentsSalaries") || "Documentos / Salarios"}</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("documents") || "Documentos"}</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noFilesYet") || "No files yet"}</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {docs.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-5 w-5 text-[#662D91] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{f.fileName}</div>
                  <div className="text-xs text-muted-foreground truncate">{[f.description, fmtSize(f.sizeBytes), formatLocalDate(f.createdAt)].filter(Boolean).join(" · ")}</div>
                </div>
                <a href={downloadUrl(f.url)} target="_blank" rel="noopener noreferrer" title={t("download") || "Download"} className="p-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950">
                  <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("salaryReceipts") || "Recibos de salario"}</h2>
        <TabTableTemplate columns={columns} data={receipts} loading={false} emptyMessage={t("noReceiptsYet") || "No receipts yet"} />
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{t("salaryReceipt") || "Recibo de Salario"} · {selected?.receiptNumber}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">{formatLocalDate(selected.periodStart)} – {formatLocalDate(selected.periodEnd)}</div>
              <div className="rounded-md border border-border divide-y divide-border">
                {selected.fixedAmount != null && (
                  <div className="flex justify-between px-3 py-2"><span>{selected.fixedLabel}</span><span>{eur(selected.fixedAmount)}</span></div>
                )}
                <div className="flex justify-between px-3 py-2"><span>{selected.hoursLabel} ({selected.hoursQty} × {eur(selected.hourRate)})</span><span>{eur(selected.hoursAmount)}</span></div>
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
