"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Trash2, Loader2, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateInput } from "@/components/ui/date-input"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(".", ",")} €`
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export default function BanksPage() {
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const isAdmin = hasRole("admin")

  const tabs: { key: string; label: string }[] = isAdmin
    ? [{ key: "FACTURAS", label: t("invoices") || "Facturas" }, { key: "COMISIONES", label: t("commissions") || "Comisiones" }]
    : [{ key: "FACTURAS", label: t("invoices") || "Facturas" }, { key: "SALARIOS", label: t("salaries") || "Salarios" }]

  const [tab, setTab] = useState(tabs[0].key)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const now = new Date()
  const prevStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const prevEnd = ymd(new Date(now.getFullYear(), now.getMonth(), 0))
  const [pStart, setPStart] = useState(prevStart)
  const [pEnd, setPEnd] = useState(prevEnd)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    setLoading(true)
    apiFetch<any>(`/bank-operations?tab=${tab}`)
      .then((j) => setRows(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [session?.accessToken, tab])
  useEffect(() => { load() }, [load])

  const closeMonth = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/bank-operations/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tab, periodStart: pStart, periodEnd: pEnd }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || "failed")
      toast({ title: body.data ? t("bankTaskGenerated") || "Tarea generada" : t("nothingToClose") || "Nada que cerrar en el periodo", variant: "success" as any })
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally { setBusy(false) }
  }

  const action = async (id: string, path: string, method = "POST") => {
    setBusy(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/bank-operations/${id}${path}`, {
        method,
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally { setBusy(false) }
  }

  const conceptText = (r: any) => {
    const k = r.kind === "COBRO" ? t("collection") || "Cobro" : t("payment") || "Pago"
    const tabLabel = tabs.find((x) => x.key === r.tab)?.label || r.tab
    return `${k} · ${tabLabel}`
  }

  const total = useMemo(() => rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0), [rows])

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("banks") || "Bancos"}</h1>
          <p className="text-sm text-muted-foreground">{t("banksHint") || "Histórico de operaciones bancarias (cobros y pagos a ordenar al banco)."}</p>
        </div>
        <div className="flex items-end gap-2">
          <div><label className="text-xs text-muted-foreground">{t("from") || "Desde"}</label><DateInput value={pStart} onChange={(e) => setPStart(e.target.value)} allowPastDates className="h-9 w-36" /></div>
          <div><label className="text-xs text-muted-foreground">{t("to") || "Hasta"}</label><DateInput value={pEnd} onChange={(e) => setPEnd(e.target.value)} allowPastDates className="h-9 w-36" /></div>
          <Button onClick={closeMonth} disabled={busy} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">{busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CalendarClock className="h-4 w-4 mr-1" />}{t("closePeriod") || "Cerrar periodo"}</Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === x.key ? "border-[#662D91] text-[#662D91]" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="w-full py-10 flex justify-center"><AnimatedLoader /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">{t("date") || "Fecha"}</th>
                <th className="px-3 py-2 font-medium">{t("period") || "Periodo"}</th>
                <th className="px-3 py-2 font-medium">{t("concept") || "Concepto"}</th>
                <th className="px-3 py-2 font-medium text-center">{t("operations") || "Operaciones"}</th>
                <th className="px-3 py-2 font-medium text-right">{t("amount") || "Importe"}</th>
                <th className="px-3 py-2 font-medium text-center">{t("origin") || "Origen"}</th>
                <th className="px-3 py-2 font-medium text-center">{t("status") || "Estado"}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t("noBankOperations") || "Sin operaciones bancarias"}</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatLocalDate(r.createdAt)}</td>
                    <td className="px-3 py-2">{formatLocalDate(r.periodStart)} – {formatLocalDate(r.periodEnd)}</td>
                    <td className="px-3 py-2">{conceptText(r)}</td>
                    <td className="px-3 py-2 text-center">{r.itemCount}</td>
                    <td className="px-3 py-2 text-right font-medium">{eur(r.totalAmount)}</td>
                    <td className="px-3 py-2 text-center"><span className="text-xs text-muted-foreground">{r.source === "AUTO" ? t("automatic") || "Automático" : t("manual") || "Manual"}</span></td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === "DONE" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {r.status === "DONE" ? t("ordered") || "Ordenada" : t("pending") || "Pendiente"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== "DONE" && (
                          <button onClick={() => action(r.id, "/mark-done")} disabled={busy} title={t("markOrdered") || "Marcar ordenada"} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:opacity-50"><Check className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => { if (confirm(t("confirmDelete") || "Delete?")) action(r.id, "", "DELETE") }} disabled={busy} title={t("delete") || "Eliminar"} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#662D91] bg-muted/30 font-semibold">
                  <td className="px-3 py-2" colSpan={4}>{t("total") || "Total"}</td>
                  <td className="px-3 py-2 text-right">{eur(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
