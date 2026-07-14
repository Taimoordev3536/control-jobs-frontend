"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Plus, Trash2, Eye, Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import TabTableTemplate from "@/components/ui/tab-table-template"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"

interface WorkerSalariosTabProps {
  workerId: string
}

const eur = (n: number) => `${(n || 0).toFixed(2)} €`

export function WorkerSalariosTab({ workerId }: WorkerSalariosTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: session } = useSession()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const authHeader = { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" }

  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState<{ fixedAmount: number | null; hoursLabel: string; hourRate: number | null }>({ fixedAmount: null, hoursLabel: "Horas de trabajo", hourRate: null })
  const [savingCfg, setSavingCfg] = useState(false)
  const [receipts, setReceipts] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)

  const [showGen, setShowGen] = useState(false)
  const today = new Date()
  const [periodStart, setPeriodStart] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`)
  const [periodEnd, setPeriodEnd] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, "0")}`)
  const [preview, setPreview] = useState<any | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.accessToken || !workerId) return
    setLoading(true)
    try {
      const [c, r] = await Promise.all([
        fetch(`${base}/worker/${workerId}/salary-config`, { headers: authHeader }).then((x) => x.json()),
        fetch(`${base}/worker/${workerId}/salaries`, { headers: authHeader }).then((x) => x.json()),
      ])
      const cfgData = c?.data || c
      if (cfgData) setCfg({ fixedAmount: cfgData.fixedAmount ?? null, hoursLabel: cfgData.hoursLabel || "Horas de trabajo", hourRate: cfgData.hourRate ?? null })
      setReceipts(Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [])
    } catch {
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken, workerId])

  useEffect(() => { load() }, [load])

  const saveCfg = async () => {
    setSavingCfg(true)
    try {
      const res = await fetch(`${base}/worker/${workerId}/salary-config`, {
        method: "PUT",
        headers: authHeader,
        body: JSON.stringify({
          fixedAmount: cfg.fixedAmount === null || cfg.fixedAmount === undefined ? null : Number(cfg.fixedAmount),
          hoursLabel: cfg.hoursLabel,
          hourRate: cfg.hourRate === null || cfg.hourRate === undefined ? null : Number(cfg.hourRate),
        }),
      })
      if (!res.ok) throw new Error("save failed")
      toast({ title: t("saved") || "Saved", variant: "success" as any })
    } catch {
      toast({ title: t("error") || "Error", variant: "destructive" })
    } finally {
      setSavingCfg(false)
    }
  }

  const calculate = async () => {
    setCalculating(true)
    setPreview(null)
    try {
      const res = await fetch(`${base}/worker/${workerId}/salaries/preview?periodStart=${periodStart}&periodEnd=${periodEnd}`, { headers: authHeader })
      const body = await res.json()
      const p = body?.data || body
      if (!res.ok) throw new Error(p?.message || "preview failed")
      setPreview(p)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setCalculating(false)
    }
  }

  const issue = async () => {
    if (!preview) return
    setIssuing(true)
    try {
      const res = await fetch(`${base}/worker/${workerId}/salaries`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          periodStart,
          periodEnd,
          fixedAmount: preview.fixedAmount,
          hoursLabel: preview.hoursLabel,
          hoursQty: preview.hoursQty,
          hourRate: preview.hourRate,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "issue failed")
      }
      toast({ title: t("receiptIssued") || "Recibo emitido", variant: "success" as any })
      setShowGen(false)
      setPreview(null)
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIssuing(false)
    }
  }

  const openPdf = async (id: string) => {
    try {
      const res = await fetch(`${base}/worker/${workerId}/salaries/${id}/pdf`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      })
      if (!res.ok) throw new Error("pdf failed")
      const url = URL.createObjectURL(await res.blob())
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t("confirmDelete") || "Delete this record permanently?")) return
    try {
      await fetch(`${base}/worker/${workerId}/salaries/${id}`, { method: "DELETE", headers: authHeader })
      setReceipts((p) => p.filter((x) => x.id !== id))
      toast({ title: t("deleted") || "Deleted", variant: "success" as any })
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const columns = [
    { key: "receiptNumber", label: t("number") || "Nº", sortable: true, render: (v: string) => v || "—" },
    { key: "periodStart", label: t("period") || "Periodo", sortable: true, render: (_v: any, row: any) => `${formatLocalDate(row.periodStart)} – ${formatLocalDate(row.periodEnd)}` },
    { key: "hoursQty", label: t("hours") || "Horas", sortable: true, align: "center" as const, render: (v: number) => (v ?? 0) },
    { key: "total", label: t("total") || "Total", sortable: true, align: "right" as const, render: (v: number) => eur(v) },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (_v: any, row: any) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setSelected(row)} title={t("view") || "View"} className="p-1.5 rounded-md text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950">
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => remove(row.id)} title={t("delete") || "Delete"} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (loading) return <div className="flex justify-center py-10"><AnimatedLoader /></div>

  return (
    <div className="space-y-4 p-2">
      <div className="rounded-md border border-border p-3">
        <h3 className="text-sm font-semibold mb-3">{t("salaryRates") || "Tarifas de salario"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("fixedExpenses") || "Gastos fijos"} (€)</label>
            <Input type="number" step="0.01" value={cfg.fixedAmount ?? ""} placeholder={t("optionalBlankOmits") || "Opcional"} onChange={(e) => setCfg((c) => ({ ...c, fixedAmount: e.target.value === "" ? null : Number(e.target.value) }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("hoursLabel") || "Texto horas"}</label>
            <Input value={cfg.hoursLabel} onChange={(e) => setCfg((c) => ({ ...c, hoursLabel: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("pricePerHour") || "Precio/hora"} (€)</label>
            <Input type="number" step="0.01" value={cfg.hourRate ?? ""} onChange={(e) => setCfg((c) => ({ ...c, hourRate: e.target.value === "" ? null : Number(e.target.value) }))} className="h-9" />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={saveCfg} disabled={savingCfg} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
            {savingCfg && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {t("save") || "Guardar"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("salaryReceipts") || "Recibos de salario"}</h3>
        <Button onClick={() => { setShowGen(true); setPreview(null) }} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
          <Plus className="h-4 w-4 mr-1" />
          {t("generateReceipt") || "Generar recibo"}
        </Button>
      </div>

      <TabTableTemplate columns={columns} data={receipts} loading={false} emptyMessage={t("noReceiptsYet") || "No receipts yet"} />

      <Dialog open={showGen} onOpenChange={(o) => { if (!o) { setShowGen(false); setPreview(null) } }}>
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>{t("generateReceipt") || "Generar recibo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">{t("from") || "Desde"}</label>
                <DateInput value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} allowPastDates className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">{t("to") || "Hasta"}</label>
                <DateInput value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} allowPastDates className="h-9" />
              </div>
            </div>
            <Button onClick={calculate} disabled={calculating} variant="outline" className="w-full h-9">
              {calculating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("calculate") || "Calcular"}
            </Button>

            {preview && (
              <div className="rounded-md border border-border divide-y divide-border text-sm">
                {preview.fixedAmount != null && (
                  <div className="flex justify-between px-3 py-2">
                    <span>{preview.fixedLabel}</span>
                    <span className="font-medium">{eur(preview.fixedAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>{preview.hoursLabel}</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={preview.hoursQty}
                      onChange={(e) => {
                        const q = Number(e.target.value) || 0
                        setPreview((p: any) => ({ ...p, hoursQty: q, hoursAmount: Math.round(q * p.hourRate * 100) / 100, total: Math.round(((p.fixedAmount ?? 0) + q * p.hourRate) * 100) / 100 }))
                      }}
                      className="h-8 w-20 text-right"
                    />
                    <span className="text-muted-foreground">× {eur(preview.hourRate)}</span>
                    <span className="font-medium w-20 text-right">{eur(preview.hoursAmount)}</span>
                  </div>
                </div>
                <div className="flex justify-between px-3 py-2 font-semibold">
                  <span>{t("total") || "Total"}</span>
                  <span>{eur(preview.total)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowGen(false); setPreview(null) }}>{t("cancel") || "Cancelar"}</Button>
            <Button onClick={issue} disabled={!preview || issuing} className="bg-[#662D91] hover:bg-[#532073] text-white">
              {issuing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {t("issueReceipt") || "Emitir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{t("salaryReceipt") || "Recibo de Salario"} · {selected?.receiptNumber}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div id="receipt-print" className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {formatLocalDate(selected.periodStart)} – {formatLocalDate(selected.periodEnd)}
              </div>
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
