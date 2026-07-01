"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Loader2 } from "lucide-react"
import PdfIconDefault from "@/icons/Controles/pdf1.svg"
import PdfIconHover from "@/icons/Controles/pdf2.svg"
import { AnimatedLoader } from "@/components/animated-loader"
import AutofacturaForm from "@/components/autofactura-form"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"

const eur = (n: number) => `${(n || 0).toFixed(2).replace(".", ",")} €`
const GROUP: Record<string, string> = { INDIVIDUAL: "Particulares", COMPANY: "Empresas", FREELANCER: "Autónomos" }

export default function CommissionDetailPage() {
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const isAdmin = hasRole("admin")

  const [af, setAf] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pdfHovered, setPdfHovered] = useState(false)

  const load = useCallback(() => {
    if (!session?.accessToken || !id) return
    setLoading(true)
    apiFetch<any>(`/commissions/${id}`).then((j) => setAf(j?.data || j)).catch(() => setAf(null)).finally(() => setLoading(false))
  }, [session?.accessToken, id])
  useEffect(() => { load() }, [load])

  const openPdf = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/commissions/${id}/pdf`, { headers: { Authorization: `Bearer ${session?.accessToken}` } })
    if (!res.ok) { toast({ title: "Error", variant: "destructive" }); return }
    const url = URL.createObjectURL(await res.blob())
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const action = async (path: string, method = "POST") => {
    setBusy(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/commissions/${id}${path}`, { method, headers: { Authorization: `Bearer ${session?.accessToken}` } })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "failed") }
      if (path === "" && method === "DELETE") { router.push("/commissions"); return }
      toast({ title: t("saved") || "OK", variant: "success" as any })
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally { setBusy(false) }
  }

  if (loading) return <div className="w-full p-10 flex justify-center"><AnimatedLoader /></div>
  if (!af) return <div className="w-full p-10 text-center text-muted-foreground">{t("notFound") || "Not found"}</div>

  const sourcesByType: Record<string, any[]> = {}
  ;(af.sources || []).forEach((s: any) => { const k = s.employerType || "OTHER"; (sourcesByType[k] ||= []).push(s) })

  return (
    <div className="bg-background min-h-[calc(100vh-60px)] w-full pb-16">
      <div className="bg-card border-b border-border">
        <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">{af.autofacturaNumber}</h1>
          <span className="text-sm sm:text-base font-medium text-foreground text-center">{t("commissionsList") || "Comisiones"}</span>
          <div className="flex justify-end">
            <button onClick={() => router.back()} className="p-1 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-3 sm:px-4 py-2 border-t border-border bg-gray-100 dark:bg-gray-800">
          <button onClick={openPdf} title="PDF" onMouseEnter={() => setPdfHovered(true)} onMouseLeave={() => setPdfHovered(false)} className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors">
            {pdfHovered ? <PdfIconHover className="w-5 h-5" /> : <PdfIconDefault className="w-5 h-5" />}
          </button>
          {isAdmin && af.status === "PENDING" && (
            <>
              <button onClick={() => action("/mark-paid")} disabled={busy} title={t("markPaid") || "Marcar pagada"} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-md transition-colors disabled:opacity-50">
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button onClick={() => action("/cancel")} disabled={busy} title={t("cancel") || "Cancelar"} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors disabled:opacity-50">
                <XCircle className="w-5 h-5" />
              </button>
              <button onClick={() => { if (confirm(t("confirmDelete") || "Delete?")) action("", "DELETE") }} disabled={busy} title={t("delete") || "Eliminar"} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors disabled:opacity-50">
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="overflow-x-auto p-4 space-y-4">
        <AutofacturaForm mode="view" autofactura={af} />

        {(af.sources || []).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("commissionDetail") || "Detalle de comisiones"}</h3>
            {Object.keys(sourcesByType).map((type) => (
              <div key={type}>
                <div className="bg-muted px-3 py-1 text-sm font-semibold rounded-t">{GROUP[type] || "Otros"}</div>
                <div className="overflow-x-auto rounded-b border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f1e9f8] dark:bg-purple-950/40">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">{t("employer") || "Empleador"}</th>
                        <th className="px-3 py-1.5 text-left font-medium">Nº Factura</th>
                        <th className="px-3 py-1.5 text-right font-medium">Subtotal</th>
                        <th className="px-3 py-1.5 text-right font-medium">{t("commission") || "Comisión"}</th>
                        <th className="px-3 py-1.5 text-right font-medium">{t("discount") || "Descuento"}</th>
                        <th className="px-3 py-1.5 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourcesByType[type].map((s: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5">{s.employerName}</td>
                          <td className="px-3 py-1.5">{s.invoiceNumber}</td>
                          <td className="px-3 py-1.5 text-right">{eur(s.subtotal)}</td>
                          <td className="px-3 py-1.5 text-right">{eur(s.commission)}</td>
                          <td className="px-3 py-1.5 text-right">-{eur(s.discount)}</td>
                          <td className="px-3 py-1.5 text-right">{eur(s.totalCommission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
