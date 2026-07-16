"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DateInput as UiDateInput } from "@/components/ui/date-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"

const money = (n: number) => (n || 0).toFixed(2).replace(".", ",")
const pad = (n: number) => String(n).padStart(2, "0")
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isoToDmy = (iso?: string | null) => {
  if (!iso) return ""
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}
const amountBox = "inline-block min-w-[88px] text-right bg-muted/60 rounded px-2 py-1 text-sm"

interface Line { description: string; amount: string }
interface Props { mode: "create" | "view"; autofactura?: any; onSaved?: (created: any) => void; onCancel?: () => void }

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-semibold w-32 shrink-0 whitespace-nowrap">{label}:</span>
      <span className="flex-1">{children}</span>
    </div>
  )
}

function DateInput({ value, onChange, width = "w-36" }: { value: string; onChange: (v: string) => void; width?: string }) {
  return (
    <div className={`${width} inline-block`}>
      <UiDateInput value={value} onChange={(e) => onChange(e.target.value)} allowPastDates className="h-9 text-sm" />
    </div>
  )
}

function PartyLines({ p }: { p: any }) {
  if (!p) return <div>—</div>
  const l2 = [p.address, p.floorDoor].filter(Boolean).join(" ")
  const l3 = [p.postalCode, p.city].filter(Boolean).join(" ")
  return (
    <>
      {p.taxId && <div>{p.taxId}</div>}
      {l2 && <div className="whitespace-pre-line">{l2}</div>}
      {l3 && <div>{l3}</div>}
      {p.province && <div>{p.province}</div>}
      {p.country && <div>{p.country}</div>}
    </>
  )
}

export default function AutofacturaForm({ mode, autofactura, onSaved, onCancel }: Props) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const isView = mode === "view"
  const editable = !isView
  const todayIso = ymd(new Date())

  const [partnerId, setPartnerId] = useState<string>(autofactura?.partnerId || "")
  const [company, setCompany] = useState<any>(autofactura?.company || null)
  const [partner, setPartner] = useState<any>(autofactura?.partner || null)
  const [nextNumber, setNextNumber] = useState<string | null>(null)

  const [periodStart, setPeriodStart] = useState(autofactura?.periodStart || `${todayIso.slice(0, 8)}01`)
  const [periodEnd, setPeriodEnd] = useState(autofactura?.periodEnd || todayIso)
  const [paymentDate, setPaymentDate] = useState(autofactura?.paymentDate || "")
  const [notes, setNotes] = useState(autofactura?.notes || "")
  const [lines, setLines] = useState<Line[]>(
    isView ? (autofactura?.lines || []).map((l: any) => ({ description: l.description, amount: String(l.amount) })) : [{ description: "", amount: "" }],
  )
  const [saving, setSaving] = useState(false)

  const { data: partners = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["autofactura", "partners"],
    enabled: !isView && !!session?.accessToken,
    queryFn: async () => {
      const j = await apiFetch<any>("/partners")
      const r = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
      return r.map((p: any) => ({ id: p.publicId, name: p.name }))
    },
  })

  // Base context (no partner) and per-partner context share one endpoint;
  // keying on partnerId refetches when a partner is picked.
  const { data: ctxData, isFetching: ctxFetching } = useQuery<{ company: any; partner: any; nextNumber: string | null }>({
    queryKey: ["commissions", "context", partnerId],
    enabled: !isView && !!session?.accessToken,
    queryFn: async () => {
      const url = partnerId ? `/commissions/context?partnerId=${partnerId}` : "/commissions/context"
      const j = await apiFetch<any>(url)
      const d = j?.data || j
      return { company: d?.company ?? null, partner: d?.partner ?? null, nextNumber: d?.nextNumber ?? null }
    },
  })
  const ctxLoading = ctxFetching && !!partnerId

  // Seed company always; when a partner is picked also seed partner/number and
  // derive the payment date if the user hasn't set one (replaces the old
  // per-partner fetch effect; no invalidation -> edits aren't clobbered).
  useEffect(() => {
    if (isView || !ctxData) return
    setCompany(ctxData.company)
    if (partnerId) {
      setPartner(ctxData.partner)
      setNextNumber(ctxData.nextNumber)
      if (!paymentDate) {
        const [ey, em] = periodEnd.split("-").map(Number)
        const pm = em === 12 ? 1 : em + 1
        const py = em === 12 ? ey + 1 : ey
        setPaymentDate(`${py}-${pad(pm)}-05`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxData, partnerId, isView])

  const retentionPct = isView ? Number(autofactura?.retentionPct) || 0 : Number(partner?.retention) || 0
  const subtotal = useMemo(() => Math.round(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0) * 100) / 100, [lines])
  const retentionAmount = isView ? Number(autofactura?.retentionAmount) || 0 : Math.round(subtotal * (retentionPct / 100) * 100) / 100
  const vatPct = isView ? Number(autofactura?.vatPct) || 0 : 21
  const vatAmount = isView ? Number(autofactura?.vatAmount) || 0 : Math.round(subtotal * (vatPct / 100) * 100) / 100
  const total = isView ? Number(autofactura?.total) || 0 : Math.round((subtotal - retentionAmount + vatAmount) * 100) / 100

  const partnerName = isView ? autofactura?.partnerName : partners.find((p) => p.id === partnerId)?.name
  const numberText = isView ? autofactura?.autofacturaNumber : nextNumber || "—"
  const ibanMasked = partner?.ibanMasked
  const status = isView ? autofactura?.status : null
  const STAMP: Record<string, { l: string; c: string }> = {
    PENDING: { l: "PENDIENTE", c: "text-red-500/80 border-red-500/80" },
    PAID: { l: "PAGADA", c: "text-green-600/80 border-green-600/80" },
    CANCELLED: { l: "CANCELADA", c: "text-gray-400/70 border-gray-400/70" },
  }

  const addLine = () => setLines((l) => [...l, { description: "", amount: "" }])
  const updateLine = (i: number, k: keyof Line, v: string) => setLines((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))
  const removeLine = (i: number) => setLines((a) => a.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!partnerId) { toast({ title: t("selectPartner") || "Select a partner", variant: "destructive" }); return }
    const clean = lines.filter((l) => l.description.trim())
    if (!clean.length) { toast({ title: t("addAtLeastOneLine") || "Add at least one line", variant: "destructive" }); return }
    if (periodEnd < periodStart) { toast({ title: t("invalidDateRange") || "End date must be after start", variant: "destructive" }); return }
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/commissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId, periodStart, periodEnd, paymentDate: paymentDate || undefined, notes, lines: clean.map((l) => ({ description: l.description.trim(), amount: Number(l.amount) || 0 })) }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || "failed")
      toast({ title: t("saved") || "Guardado", variant: "success" as any })
      onSaved?.(body.data)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally { setSaving(false) }
  }

  return (
    <div className="w-full min-w-[900px] bg-white dark:bg-card text-foreground text-sm">
      {/* Header: LEFT 60% (partner + meta) / RIGHT 40% (FACTURA + ControlJobs) */}
      <div className="flex gap-6 px-6 pt-3 pb-3">
        <div className="w-3/5 min-w-0">
          {partner?.logoUrl && <img src={partner.logoUrl} alt="" className="h-12 object-contain mb-1" />}
          {editable ? (
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger className="w-full max-w-sm h-9"><SelectValue placeholder={t("selectPartner") || "Seleccionar partner"} /></SelectTrigger>
              <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <div className="text-lg font-semibold">{partnerName}</div>
          )}
          <div className="mt-1 text-xs text-muted-foreground italic leading-5">
            <PartyLines p={partner} />
          </div>

          <div className="mt-5 space-y-1.5">
            <Meta label={t("date") || "Fecha"}>{isView ? isoToDmy(autofactura?.issueDate) : isoToDmy(todayIso)}</Meta>
            <Meta label={t("selfInvoiceNo") || "Nº Factura"}>{numberText}</Meta>
            <Meta label={t("period") || "Periodo"}>
              {editable ? (
                <span className="flex items-center gap-1">
                  <DateInput value={periodStart} onChange={setPeriodStart} />
                  <span>-</span>
                  <DateInput value={periodEnd} onChange={setPeriodEnd} />
                </span>
              ) : (
                `${isoToDmy(periodStart)} - ${isoToDmy(periodEnd)}`
              )}
            </Meta>
            <Meta label={t("paymentMethod") || "Forma de pago"}>
              <span className="flex items-center gap-3 flex-wrap">
                <span>Transferencia</span>
                {ibanMasked && <span className="text-muted-foreground">IBAN: {ibanMasked}</span>}
              </span>
            </Meta>
            <Meta label={t("paymentDate") || "Fecha de pago"}>
              {editable ? <DateInput value={paymentDate} onChange={setPaymentDate} /> : isoToDmy(autofactura?.paymentDate) || "—"}
            </Meta>
          </div>
        </div>

        <div className="w-2/5 shrink-0 flex flex-col">
          <h1 className="text-3xl font-bold text-right mb-3">{t("invoiceTitle") || "FACTURA"}</h1>
          {ctxLoading ? (
            <div className="flex justify-end py-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="text-right leading-5">
              <div className="text-sm font-semibold">{company?.name || "ControlJobs"}</div>
              <div className="text-xs text-muted-foreground italic">
                <PartyLines p={company} />
              </div>
            </div>
          )}
          <div className="mt-auto pt-6 flex justify-end">
            {editable && (
              <Button onClick={addLine} className="bg-[#662D91] hover:bg-[#532073] text-white h-8"><Plus className="h-4 w-4 mr-1" />{t("newLine") || "Nueva línea"}</Button>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="px-6">
        <div className="flex items-center bg-purple-50 dark:bg-purple-950/40 border-b-2 border-[#662D91] py-2 text-xs font-semibold">
          <div className="flex-1 px-2 text-center">{t("concept") || "Concepto"}</div>
          <div className="w-32 text-right pr-2">{t("total") || "Total"}</div>
          {editable && <div className="w-8" />}
        </div>
        <div>
          {lines.length === 0 && !editable ? (
            <div className="py-6 text-center text-sm text-muted-foreground">—</div>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="flex items-center py-2 gap-2 border-b border-border">
                <div className="flex-1 px-1">
                  {editable ? (
                    <Input value={l.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder={t("concept") || "Concepto"} className="h-8 text-sm" />
                  ) : (
                    <span className="px-1">{l.description}</span>
                  )}
                </div>
                <div className="w-32 flex justify-end pr-2">
                  {editable ? (
                    <Input type="number" inputMode="decimal" value={l.amount} onChange={(e) => updateLine(i, "amount", e.target.value)} className="h-8 w-28 text-sm text-right" step="0.01" placeholder="0,00" />
                  ) : (
                    <span className={amountBox}>{money(Number(l.amount))}</span>
                  )}
                </div>
                {editable && <button onClick={() => removeLine(i)} className="w-8 flex justify-center text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notes + totals */}
      <div className="relative px-6 py-4 flex flex-row gap-6">
        {status && (
          <div className="pointer-events-none absolute bottom-8 left-1/3 -translate-x-1/2">
            <span className={`inline-block rotate-[-18deg] border-4 rounded px-4 py-1 text-3xl font-extrabold uppercase tracking-wider ${STAMP[status]?.c || "text-gray-400/70 border-gray-400/70"}`}>{STAMP[status]?.l || status}</span>
          </div>
        )}
        <div className="flex-1">
          {editable ? (
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes") || "Observaciones"} className="h-28 text-sm" />
          ) : autofactura?.isManual ? (
            <div className="border border-border rounded p-3 text-sm whitespace-pre-line h-28 overflow-auto text-muted-foreground">{autofactura?.notes || ""}</div>
          ) : null}
        </div>

        <div className="w-80 shrink-0">
          <div className="border border-border rounded overflow-hidden">
            <div className="text-center text-xs font-semibold text-foreground bg-purple-50 dark:bg-purple-950/40 py-1.5">{t("taxBreakdown") || "Desglose fiscal"}</div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t("taxBase") || "Base imponible"}</span>
                <span className={amountBox}>{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  {t("retention") || "% Retención"}
                  <span className="inline-block w-12 text-center border border-border rounded px-1 py-0.5 text-xs bg-muted/30">{retentionPct}</span>
                </span>
                <span className={amountBox}>−{money(retentionAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">I.V.A. ({vatPct}%)</span>
                <span className={amountBox}>{money(vatAmount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-[#662D91] text-white px-3 py-2 font-bold">
              <span>{t("totalToPay") || "TOTAL A PAGAR"}</span>
              <span>{money(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {editable && (
        <div className="px-6 pb-6 flex gap-3">
          <Button onClick={save} disabled={saving} className="bg-[#662D91] hover:bg-[#532073] text-white">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{t("keep") || "Guardar"}</Button>
          <Button onClick={onCancel} variant="secondary" disabled={saving}>{t("cancel") || "Cancelar"}</Button>
        </div>
      )}
    </div>
  )
}
