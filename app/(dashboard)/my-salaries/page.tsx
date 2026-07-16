"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Download, FileText, Eye, Printer, ArrowLeft } from "lucide-react"
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

type Tab = "salarios" | "justificantes" | "otros"

export default function MyDocumentsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [selected, setSelected] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("salarios")

  const asArray = (x: any) => (Array.isArray(x?.data) ? x.data : Array.isArray(x) ? x : [])
  const { data: docs = [], isLoading: docsLoading } = useQuery<any[]>({
    queryKey: ["worker", "me", "documents"],
    queryFn: async () => asArray(await apiFetch<any>("/worker/me/documents")),
    enabled: status === "authenticated",
  })
  const { data: receipts = [], isLoading: recLoading } = useQuery<any[]>({
    queryKey: ["worker", "me", "salaries"],
    queryFn: async () => asArray(await apiFetch<any>("/worker/me/salaries")),
    enabled: status === "authenticated",
  })
  const loading = docsLoading || recLoading

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


  const columns = [
    { key: "receiptNumber", label: t("number") || "Nº", sortable: true, render: (v: string) => v || "—" },
    { key: "periodStart", label: t("period") || "Periodo", sortable: true, render: (_v: any, row: any) => `${formatLocalDate(row.periodStart)} – ${formatLocalDate(row.periodEnd)}` },
    { key: "hoursQty", label: t("hours") || "Horas", sortable: true, align: "center" as const, render: (v: number) => v ?? 0 },
    { key: "total", label: t("total") || "Total", sortable: true, align: "right" as const, render: (v: number) => eur(v) },
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

  const renderDocs = (items: any[]) =>
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">{t("noFilesYet") || "No files yet"}</p>
    ) : (
      <ul className="divide-y divide-border rounded-md border border-border">
        {items.map((f) => (
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
    )

  const justificantes = docs.filter((d) => d.category === "justificante")
  const otros = docs.filter((d) => d.category !== "justificante")

  const tabs: { key: Tab; label: string }[] = [
    { key: "salarios", label: t("salaries") || "Salarios" },
    { key: "justificantes", label: t("justificantes") || "Justificantes" },
    { key: "otros", label: t("others") || "Otros" },
  ]

  if (loading) return <div className="w-full p-6 flex justify-center"><AnimatedLoader /></div>

  return (
    <div className="w-full px-4 md:px-6 pt-2 pb-4 md:pb-6 bg-background min-h-screen space-y-4">
      <div className="space-y-1">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-[#662D91] inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("back") || "Atrás"}
        </button>
        <h1 className="text-2xl font-semibold text-foreground">{t("documents") || "Documentos"}</h1>
      </div>

      <div className="border-b border-border">
        <nav className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === "salarios" && (
          <TabTableTemplate columns={columns} data={receipts} loading={false} emptyMessage={t("noReceiptsYet") || "No receipts yet"} />
        )}
        {activeTab === "justificantes" && renderDocs(justificantes)}
        {activeTab === "otros" && renderDocs(otros)}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md p-0 gap-0 max-h-[90vh] flex flex-col bg-background overflow-hidden">
          <DialogHeader className="p-6 pb-4 space-y-2 border-b border-border">
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
              {t("salaryReceipt") || "Recibo de Salario"}
            </DialogTitle>
            {selected && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selected.receiptNumber}</span>
                <span>· {formatLocalDate(selected.periodStart)} – {formatLocalDate(selected.periodEnd)}</span>
              </div>
            )}
          </DialogHeader>

          {selected && (
            <div className="px-6 py-5 flex-1 overflow-y-auto">
              <div className="rounded-xl border border-border divide-y divide-border overflow-hidden text-sm">
                {selected.fixedAmount != null && (
                  <div className="flex justify-between px-4 py-3"><span className="text-muted-foreground">{selected.fixedLabel}</span><span className="font-medium">{eur(selected.fixedAmount)}</span></div>
                )}
                <div className="flex justify-between px-4 py-3"><span className="text-muted-foreground">{selected.hoursLabel} ({selected.hoursQty} × {eur(selected.hourRate)})</span><span className="font-medium">{eur(selected.hoursAmount)}</span></div>
                <div className="flex justify-between px-4 py-3 font-semibold bg-muted/30"><span>{t("total") || "Total"}</span><span>{eur(selected.total)}</span></div>
              </div>
            </div>
          )}

          <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => selected && openPdf(selected.id)}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
            <Button onClick={() => setSelected(null)} className="bg-[#662D91] hover:bg-[#532073] text-white">{t("close") || "Cerrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
