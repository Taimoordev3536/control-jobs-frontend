"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateInput as UiDateInput } from "@/components/ui/date-input"
import { Plus, Trash2 } from "lucide-react"
import BuildingsIcon from "../icons/Menu/buildings.svg"
import WorkersIcon from "../icons/Menu/workers.svg"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { AnimatedLoader } from "@/components/animated-loader"

type Mode = "view" | "create" | "generate" | "edit"

interface Line {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

interface FormContext {
  company:
    | {
        name: string
        taxId?: string | null
        address?: string | null
        postalCode?: string | null
        city?: string | null
        province?: string | null
        country?: string | null
        paymentDetails?: string | null
      }
    | null
  client:
    | { id: number; name: string; taxId: string; address: string; postalCode: string; city: string; province: string; country: string }
    | null
  payment: {
    methodId: number | null
    methodCode: string | null
    methodName: string | null
    ibanMasked: string | null
    cardMasked: string | null
    paypalEmail: string | null
  }
  paymentMethods: { id: number; name: string }[]
  tariff: { code: string; label: string; tariffType: string } | null
  defaultDiscount: number
  partnerCommission: number
  nextInvoiceNumber?: string
}

interface GeneratePayload {
  workCenterIds: number[]
  workerIds: number[]
  fixedFee: number
  discountPct: number
  chargeDate: string
}

interface InvoiceFormProps {
  mode: Mode
  invoice?: any
  onSubmitted?: (created?: any) => void
  onCancel?: () => void
  allowMethodEdit?: boolean
  onMethodChanged?: () => void
  onGenerate?: (payload: GeneratePayload) => void
  onSave?: (payload: GeneratePayload) => void
  generating?: boolean
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const money = (n: number) => `${round2(n).toFixed(2).replace(".", ",")} €`

const isoToDmy = (iso?: string | null) => {
  if (!iso) return ""
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}

const STAMP_COLOR: Record<string, string> = {
  PENDING: "text-red-500/70 border-red-500/70",
  OVERDUE: "text-red-500/70 border-red-500/70",
  PAID: "text-green-600/70 border-green-600/70",
  CANCELLED: "text-gray-400/70 border-gray-400/70",
  REFUNDED: "text-gray-400/70 border-gray-400/70",
}

export default function InvoiceForm({ mode, invoice, onSubmitted, onCancel, allowMethodEdit, onMethodChanged, onGenerate, onSave, generating }: InvoiceFormProps) {
  const { t, tEnum } = useTranslation()
  const { toast } = useToast()

  const isEdit = mode === "edit"
  const editGen = mode === "generate" || mode === "edit"

  const [ctx, setCtx] = useState<FormContext | null>(null)
  const [employers, setEmployers] = useState<{ id: number; name: string }[]>([])
  const [selectedEmployer, setSelectedEmployer] = useState<string>("")
  const [lines, setLines] = useState<Line[]>([])
  const [discountPct, setDiscountPct] = useState(0)
  const [discountText, setDiscountText] = useState("0")
  const [vatPct, setVatPct] = useState(21)
  const [vatText, setVatText] = useState("21")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [chargeDate, setChargeDate] = useState("")
  const [remarks, setRemarks] = useState("")
  const [paymentMethodId, setPaymentMethodId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [ctxLoading, setCtxLoading] = useState(false)

  // generate/edit editable state
  const [genWcSel, setGenWcSel] = useState<Set<number>>(new Set())
  const [genWorkerSel, setGenWorkerSel] = useState<Set<number>>(new Set())
  const [genFixedFee, setGenFixedFee] = useState("0")

  useEffect(() => {
    if (mode !== "create") return
    apiFetch<{ data: any[] }>("/employers")
      .then((j) => setEmployers((j.data || []).map((e) => ({ id: e.id, name: e.name }))))
      .catch(() => setEmployers([]))
    apiFetch<{ data: FormContext }>("/invoices/form-context")
      .then((j) => setCtx(j.data))
      .catch(() => {})
  }, [mode])

  useEffect(() => {
    if (mode === "view" && invoice?.payment?.methodId) {
      setPaymentMethodId(String(invoice.payment.methodId))
    }
  }, [mode, invoice?.payment?.methodId])

  useEffect(() => {
    if (!editGen || !invoice) return
    const selWc = isEdit && invoice.selectedWorkCenterIds ? invoice.selectedWorkCenterIds : (invoice.workCenters || []).map((w: any) => w.id)
    const selWk = isEdit && invoice.selectedWorkerIds ? invoice.selectedWorkerIds : (invoice.workers || []).map((w: any) => w.id)
    setGenWcSel(new Set(selWc))
    setGenWorkerSel(new Set(selWk))
    setGenFixedFee(String(Number(invoice.monthlyFixedRate) || 0))
    setDiscountPct(Number(invoice.discountPct) || 0)
    setVatPct(Number(invoice.vatPct) || 0)
    setChargeDate(isEdit && invoice.chargeDate ? String(invoice.chargeDate).slice(0, 10) : "")
    if (invoice.payment?.methodId) setPaymentMethodId(String(invoice.payment.methodId))
  }, [editGen, isEdit, invoice?.publicId, invoice?.employerId, invoice?.periodStart])

  const changeMethod = async (id: string) => {
    setPaymentMethodId(id)
    if (mode !== "view" || !invoice?.publicId) return
    try {
      await apiFetch(`/invoices/${invoice.publicId}/payment-method`, {
        method: "POST",
        body: { paymentMethodId: Number(id) },
      })
      toast({ title: t("saved") || "Saved", variant: "success" as any })
      onMethodChanged?.()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (mode !== "create" || !selectedEmployer) return
    setCtxLoading(true)
    apiFetch<{ data: FormContext }>(`/invoices/form-context?employerId=${selectedEmployer}`)
      .then((j) => {
        setCtx(j.data)
        setDiscountPct(j.data.defaultDiscount || 0)
        if (j.data.payment?.methodId) setPaymentMethodId(String(j.data.payment.methodId))
      })
      .catch(() => {})
      .finally(() => setCtxLoading(false))
  }, [mode, selectedEmployer])

  const addLine = () =>
    setLines((p) => [...p, { id: `${p.length}-${p.reduce((s, l) => s + l.unitPrice, 0)}-${p.length}`, description: "", quantity: 1, unitPrice: 0 }])
  const removeLine = (id: string) => setLines((p) => p.filter((l) => l.id !== id))
  const updateLine = (id: string, field: keyof Line, value: string | number) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)))

  const toggleSet = (setter: typeof setGenWcSel, id: number) =>
    setter((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const doEditGen = () => {
    if (chargeDate && chargeDate < todayIso) {
      toast({ title: t("chargeDateNotPast") || "Charge date cannot be before today", variant: "destructive" })
      return
    }
    const payload = {
      workCenterIds: Array.from(genWcSel),
      workerIds: Array.from(genWorkerSel),
      fixedFee: round2(Number(genFixedFee) || 0),
      discountPct,
      chargeDate,
    }
    if (isEdit) onSave?.(payload)
    else onGenerate?.(payload)
  }

  const viewRows = useMemo(() => {
    if (mode === "create" || !invoice) return []
    if (invoice.isManual && invoice.lines?.length) {
      return invoice.lines.map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        total: Number(l.lineTotal),
      }))
    }
    const perWc = Number(invoice.perWorkCenterRate)
    const perWorker = Number(invoice.perWorkerRate)
    const wcCount = editGen ? genWcSel.size : invoice.workcenterCount
    const workerCount = editGen ? genWorkerSel.size : invoice.workerCount
    const fixed = editGen ? round2(Number(genFixedFee) || 0) : Number(invoice.monthlyFixedRate)
    const fixedTotal = editGen ? fixed : Number(invoice.fixedAmount)
    const wcTotal = editGen ? round2(wcCount * perWc) : Number(invoice.workcenterAmount)
    const workerTotal = editGen ? round2(workerCount * perWorker) : Number(invoice.workerAmount)
    return [
      { description: t("fixedFee") || "Cuota fija", quantity: 1, unitPrice: fixed, total: fixedTotal },
      { description: t("workCenters") || "Centros de trabajo", quantity: wcCount, unitPrice: perWc, total: wcTotal },
      { description: t("employees") || "Trabajadores", quantity: workerCount, unitPrice: perWorker, total: workerTotal },
    ]
  }, [mode, invoice, t, editGen, genWcSel, genWorkerSel, genFixedFee])

  const totals = useMemo(() => {
    if (mode === "view" && invoice) {
      return {
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        base: Number(invoice.subtotal) - Number(invoice.discountAmount),
        vatAmount: Number(invoice.vatAmount),
        total: Number(invoice.total),
      }
    }
    const rows = editGen ? viewRows : lines.map((l) => ({ total: l.quantity * l.unitPrice }))
    const subtotal = round2(rows.reduce((s: number, r: any) => s + (r.total || 0), 0))
    const discountAmount = round2((subtotal * discountPct) / 100)
    const base = round2(subtotal - discountAmount)
    const vatAmount = round2((base * vatPct) / 100)
    return { subtotal, discountAmount, base, vatAmount, total: round2(base + vatAmount) }
  }, [mode, invoice, lines, discountPct, vatPct, editGen, viewRows])

  useEffect(() => {
    setDiscountText((prev) => (Number.parseFloat(prev.replace(",", ".")) === discountPct ? prev : String(discountPct)))
  }, [discountPct])

  useEffect(() => {
    setVatText((prev) => (Number.parseFloat(prev.replace(",", ".")) === vatPct ? prev : String(vatPct)))
  }, [vatPct])

  const todayIso = new Date().toISOString().slice(0, 10)
  const status = mode === "view" ? invoice?.status : null
  const docTitle = totals.total < 0 ? t("creditNoteTitle") || "ABONO" : t("invoiceTitle") || "FACTURA"
  const editable = mode === "create"

  const fromInvoice = mode !== "create"
  const company = fromInvoice ? invoice?.company : ctx?.company
  const client = fromInvoice ? invoice?.client : ctx?.client
  const payment = fromInvoice ? invoice?.payment : ctx?.payment
  const tariff = (fromInvoice ? invoice?.tariff : ctx?.tariff) as FormContext["tariff"]
  const effDiscountPct = mode === "view" ? Number(invoice?.discountPct) || 0 : discountPct
  const effVatPct = mode === "view" ? Number(invoice?.vatPct) || 0 : vatPct

  const methodsList: { id: number; name: string }[] =
    (fromInvoice ? invoice?.paymentMethods : ctx?.paymentMethods) || []
  const activeMethodCode =
    methodsList.find((m) => String(m.id) === paymentMethodId)?.name || payment?.methodCode || null

  const maskedDetail =
    activeMethodCode === "CARD"
      ? payment?.cardMasked && { label: t("cardNo") || "N.º", value: payment.cardMasked }
      : activeMethodCode === "PAYPAL"
        ? payment?.paypalEmail && { label: t("email") || "eMail", value: payment.paypalEmail }
        : activeMethodCode === "DIRECT_DEBIT" || activeMethodCode === "TRANSFER"
          ? payment?.ibanMasked && { label: "IBAN", value: payment.ibanMasked }
          : null

  const submit = async () => {
    if (!selectedEmployer) {
      toast({ title: t("selectAnEmployer") || "Select an employer", variant: "destructive" })
      return
    }
    if (lines.length === 0) {
      toast({ title: t("addAtLeastOneLine") || "Add at least one line", variant: "destructive" })
      return
    }
    if (ctx && discountPct > ctx.partnerCommission) {
      toast({ title: (t("discountExceedsCommission") || "Discount exceeds commission") + ` (${ctx.partnerCommission}%)`, variant: "destructive" })
      return
    }
    if (chargeDate && chargeDate < todayIso) {
      toast({ title: t("chargeDateNotPast") || "Charge date cannot be before today", variant: "destructive" })
      return
    }
    if (periodStart && periodEnd && periodEnd < periodStart) {
      toast({ title: t("periodEndBeforeStart") || "End date must be on or after the start date", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch<{ data: any }>("/invoices", {
        method: "POST",
        body: {
          employerId: Number(selectedEmployer),
          invoiceType: totals.total < 0 ? "RECTIFICATIVA" : "NORMAL",
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined,
          chargeDate: chargeDate || undefined,
          remarks: remarks || undefined,
          paymentMethodId: paymentMethodId ? Number(paymentMethodId) : undefined,
          discountPct,
          vatPct,
          lines: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitPrice: l.unitPrice })),
        },
      })
      toast({ title: t("invoiceCreated") || "Invoice created", variant: "success" as any })
      onSubmitted?.(res.data)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const amountBox = "inline-block min-w-[88px] text-right bg-muted/60 rounded px-2 py-1 text-sm"

  return (
    <div className="w-full min-w-[900px] bg-white dark:bg-card text-foreground text-sm">
      {/* ── Header: 60% (company + meta) / 40% (title + client + tariff) ── */}
      <div className="flex gap-6 px-6 pt-3 pb-3">
        {/* LEFT 60% */}
        <div className="w-3/5 min-w-0">
          <div className="flex items-center text-2xl font-normal mb-1">
            <span className="text-foreground">Control</span>
            <span className="text-[#662D91]">Jobs</span>
          </div>
          <div className="text-xs text-muted-foreground italic leading-5">
            {company?.name ? <div>{company.name}</div> : null}
            {company?.taxId ? <div>{company.taxId}</div> : null}
            {company?.address ? <div className="whitespace-pre-line">{company.address}</div> : null}
            {company?.postalCode || company?.city ? (
              <div>{[company?.postalCode, company?.city].filter(Boolean).join(" ")}</div>
            ) : null}
            {company?.province ? <div>{company.province}</div> : null}
            {company?.country ? <div>{company.country}</div> : null}
            {!company?.name && !company?.address && <div>—</div>}
          </div>

          <div className="mt-5 space-y-1.5">
            <Meta label={t("date") || "Fecha"}>
              {mode === "view" ? isoToDmy(invoice?.issueDate) : isoToDmy(todayIso)}
            </Meta>
            <Meta label={t("invoiceNo") || "Nº Factura"}>{invoice?.invoiceNumber || ctx?.nextInvoiceNumber || t("autoAssigned") || "(auto)"}</Meta>
            <Meta label={t("period") || "Periodo"}>
              {editable ? (
                <span className="flex items-center gap-1">
                  <DateInput value={periodStart} onChange={setPeriodStart} allowPast width="w-36" />
                  <span>-</span>
                  <DateInput value={periodEnd} onChange={setPeriodEnd} allowPast width="w-36" />
                </span>
              ) : (
                `${isoToDmy(invoice?.periodStart)} - ${isoToDmy(invoice?.periodEnd)}`
              )}
            </Meta>
            <Meta label={t("paymentMethod") || "Forma de pago"}>
              <span className="flex items-center gap-3 flex-wrap">
                {editable || (mode === "view" && allowMethodEdit && invoice?.status === "PENDING") ? (
                  <Select value={paymentMethodId} onValueChange={editable ? setPaymentMethodId : changeMethod} disabled={!methodsList.length}>
                    <SelectTrigger className="h-8 w-52 text-sm">
                      <SelectValue placeholder={t("paymentMethod") || "Forma de pago"} />
                    </SelectTrigger>
                    <SelectContent>
                      {methodsList.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{tEnum("paymentMethod", m.name) || m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{tEnum("paymentMethod", payment?.methodCode) || payment?.methodName || "—"}</span>
                )}
                {maskedDetail && (
                  <span className="text-muted-foreground">{maskedDetail.label}: {maskedDetail.value}</span>
                )}
              </span>
            </Meta>
            <Meta label={t("chargeDate") || "Fecha de cargo"}>
              {editable || editGen ? <DateInput value={chargeDate} onChange={setChargeDate} errorPosition="right" /> : isoToDmy(invoice?.chargeDate) || "—"}
            </Meta>
          </div>
        </div>

        {/* RIGHT 40% */}
        <div className="w-2/5 shrink-0 flex flex-col">
          <h1 className="text-3xl font-bold text-right mb-3">{docTitle}</h1>
          {editable ? (
            <Select value={selectedEmployer} onValueChange={setSelectedEmployer}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder={t("selectAnEmployer") || "Select an employer"} />
              </SelectTrigger>
              <SelectContent>
                {employers.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="border border-border rounded px-3 py-2 font-semibold">{client?.name || `#${invoice?.employerId}`}</div>
          )}
          {ctxLoading ? (
            <div className="mt-2 flex justify-start py-2">
              <AnimatedLoader size={24} />
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground italic leading-5">
              {client?.taxId && <div>{client.taxId}</div>}
              {client?.address && <div>{client.address}</div>}
              <div>{[client?.postalCode, client?.city].filter(Boolean).join("  ")}</div>
              <div>{[client?.province, client?.country].filter(Boolean).join("  ")}</div>
            </div>
          )}

          <div className="mt-auto pt-6 flex items-center justify-between gap-2">
            {tariff ? (
              <span className="text-sm font-semibold text-[#662D91]">
                {(t("tariff") || "TARIFA")} {tariff.tariffType || tariff.label}
              </span>
            ) : (
              <span />
            )}
            {!editGen && (
              <Button
                onClick={addLine}
                disabled={!editable}
                className="bg-[#662D91] hover:bg-[#532073] text-white h-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t("newLine") || "Nueva línea"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Line items ── */}
      <div className="px-6">
        <div className="flex items-center bg-purple-50 dark:bg-purple-950/40 border-b-2 border-[#662D91] py-2 text-xs font-semibold">
          <div className="flex-1 px-2">{t("billingSummary") || "Resumen de facturación"}</div>
          <div className="w-24 text-center">{t("quantity") || "Cantidad"}</div>
          <div className="w-24 text-center">{t("price") || "Precio"}</div>
          <div className="w-24 text-right pr-2">{t("total") || "Total"}</div>
          {editable && <div className="w-8" />}
        </div>

        <div>
          {editable ? (
            lines.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{t("noInvoiceLines") || "There are no lines on the invoice"}</div>
            ) : (
              lines.map((l) => (
                <div key={l.id} className="flex items-center py-2 gap-2 border-b border-border">
                  <div className="flex-1 px-1">
                    <Input value={l.description} onChange={(e) => updateLine(l.id, "description", e.target.value)} placeholder={t("serviceDescription") || "Service description"} className="h-8 text-sm" />
                  </div>
                  <div className="w-24"><Input type="number" value={l.quantity} onChange={(e) => updateLine(l.id, "quantity", Number.parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" step="1" /></div>
                  <div className="w-24"><Input type="number" value={l.unitPrice} onChange={(e) => updateLine(l.id, "unitPrice", Number.parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center" step="0.01" /></div>
                  <div className="w-24 flex justify-end pr-2 text-sm"><span className="inline-block min-w-[72px] text-right bg-muted/60 rounded px-2 py-1">{money(l.quantity * l.unitPrice)}</span></div>
                  <button onClick={() => removeLine(l.id)} className="w-8 flex justify-center text-muted-foreground hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))
            )
          ) : (
            viewRows.map((r: any, i: number) => (
              <div key={i} className="flex items-center py-2 text-sm border-b border-border">
                <div className="flex-1 px-2">{r.description}</div>
                <div className="w-24 flex justify-center"><span className="inline-block min-w-[56px] text-center bg-muted/60 rounded px-2 py-1">{r.quantity}</span></div>
                <div className="w-24 flex justify-center">
                  {editGen && i === 0 ? (
                    <Input
                      type="number"
                      value={genFixedFee}
                      onChange={(e) => setGenFixedFee(e.target.value)}
                      className="h-8 w-20 text-sm text-center"
                      step="0.01"
                      min={0}
                    />
                  ) : (
                    <span className="inline-block min-w-[72px] text-right bg-muted/60 rounded px-2 py-1">{money(r.unitPrice)}</span>
                  )}
                </div>
                <div className="w-24 flex justify-end pr-2"><span className="inline-block min-w-[72px] text-right bg-muted/60 rounded px-2 py-1">{money(r.total)}</span></div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Remarks (left) + totals (right) ── */}
      <div className="relative px-6 py-4 flex flex-row gap-6">
        {status && (
          <div className="pointer-events-none absolute bottom-8 left-1/3 -translate-x-1/2">
            <span className={`inline-block rotate-[-18deg] border-4 rounded px-4 py-1 text-3xl font-extrabold uppercase tracking-wider ${STAMP_COLOR[status] || "text-gray-400/70 border-gray-400/70"}`}>
              {tEnum("invoiceStatus", status) || status}
            </span>
          </div>
        )}

        {/* Remarks */}
        <div className="flex-1">
          {editable ? (
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t("remarks") || "Observaciones"} className="h-28 text-sm" />
          ) : (
            <div className="border border-border rounded p-3 text-sm whitespace-pre-line h-[4.5rem] overflow-auto text-muted-foreground">{invoice?.remarks || ""}</div>
          )}
        </div>

        {/* Totals */}
        <div className="w-80 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{t("subtotal") || "Subtotal"}</span>
            <span className={amountBox}>{money(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              {t("discount") || "% Dto."}
              {editable || editGen ? (
                <span className="inline-flex items-center gap-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={discountText}
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".")
                      if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return
                      setDiscountText(raw)
                      setDiscountPct(Number.parseFloat(raw) || 0)
                    }}
                    className="h-7 w-20 text-xs text-center"
                  />
                  <span className="text-muted-foreground">%</span>
                </span>
              ) : (
                effDiscountPct > 0 && <span className="text-muted-foreground">({effDiscountPct}%)</span>
              )}
            </span>
            <span className={amountBox}>−{money(totals.discountAmount)}</span>
          </div>
          {(editable && ctx) && (
            <div className="text-[10px] text-muted-foreground text-right -mt-1">{(t("maxDiscount") || "Max")}: {ctx.partnerCommission}%</div>
          )}
          {editGen && invoice?.partnerCommission != null && (
            <div className="text-[10px] text-muted-foreground text-right -mt-1">{(t("maxDiscount") || "Max")}: {invoice.partnerCommission}%</div>
          )}

          <div className="border border-border rounded overflow-hidden">
            <div className="text-center text-xs font-semibold text-foreground bg-purple-50 dark:bg-purple-950/40 py-1.5">
              {t("taxBreakdown") || "Desglose fiscal"}
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t("taxBase") || "Base imponible"}</span>
                <span className={amountBox}>{money(totals.base)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1">
                  {t("vat") || "I.V.A."}
                  {editable ? (
                    <span className="inline-flex items-center gap-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={vatText}
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".")
                          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return
                          setVatText(raw)
                          setVatPct(Number.parseFloat(raw) || 0)
                        }}
                        className="h-6 w-20 text-xs text-center"
                      />
                      <span className="text-muted-foreground">%</span>
                    </span>
                  ) : (
                    `${effVatPct}%`
                  )}
                </span>
                <span className={amountBox}>{money(totals.vatAmount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-[#662D91] text-white px-3 py-2 font-bold">
              <span>{t("totalToPay") || "TOTAL A PAGAR"}</span>
              <span>{money(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions (create) ── */}
      {editable && (
        <div className="px-6 pb-6 flex gap-3">
          <Button onClick={submit} disabled={submitting} className="bg-[#662D91] hover:bg-[#532073] text-white">
            {submitting ? t("saving") || "Saving..." : t("keep") || "Guardar"}
          </Button>
          <Button onClick={onCancel} variant="secondary" disabled={submitting}>{t("cancel") || "Cancelar"}</Button>
        </div>
      )}

      {/* ── Page 2: worksites + workers (auto invoices / generate) ── */}
      {((mode === "view" && invoice?.accessLevel !== "page1Only" && !invoice?.isManual) || editGen) && (
          <div className="px-6 py-4 border-t border-border">
            <div className="text-center text-sm font-semibold text-[#662D91] border-b-2 border-[#662D91] pb-1 mb-4">
              {t("billingDetail") || "Detalle de facturación"}
            </div>
            <div className="flex gap-5 items-start pb-4">
              <BuildingsIcon className="h-9 w-9 shrink-0 text-[#662D91]" />
              <ul className="text-sm space-y-0.5">
                {(invoice?.workCenters || []).map((w: any) =>
                  editGen ? (
                    <li key={w.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={genWcSel.has(w.id)} onChange={() => toggleSet(setGenWcSel, w.id)} className="accent-[#662D91]" />
                      <span className={genWcSel.has(w.id) ? "" : "line-through text-muted-foreground"}>{w.name}</span>
                    </li>
                  ) : (
                    <li key={w.name}>- {w.name}</li>
                  ),
                )}
                {!(invoice?.workCenters?.length) && <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
            <div className="border-t-2 border-[#662D91]" />
            <div className="flex gap-5 items-start pt-4">
              <WorkersIcon className="h-9 w-9 shrink-0 text-[#662D91]" />
              <ul className="text-sm space-y-0.5">
                {(invoice?.workers || []).map((w: any) =>
                  editGen ? (
                    <li key={w.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={genWorkerSel.has(w.id)} onChange={() => toggleSet(setGenWorkerSel, w.id)} className="accent-[#662D91]" />
                      <span className={genWorkerSel.has(w.id) ? "" : "line-through text-muted-foreground"}>{w.name}</span>
                    </li>
                  ) : (
                    <li key={w.name}>- {w.name}</li>
                  ),
                )}
                {!(invoice?.workers?.length) && <li className="text-muted-foreground">—</li>}
              </ul>
            </div>
          </div>
        )}

      {/* ── Actions (generate / edit) ── */}
      {editGen && (
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <Button onClick={doEditGen} disabled={generating} className="bg-[#662D91] hover:bg-[#532073] text-white">
            {generating ? t("saving") || "Saving..." : isEdit ? t("keep") || "Guardar" : t("generate") || "Generar"}
          </Button>
          <Button onClick={onCancel} variant="secondary" disabled={generating}>{t("cancel") || "Cancelar"}</Button>
        </div>
      )}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-semibold w-32 shrink-0 whitespace-nowrap">{label}:</span>
      <span className="flex-1">{children}</span>
    </div>
  )
}

function DateInput({ value, onChange, allowPast, width = "w-40", errorPosition }: { value: string; onChange: (v: string) => void; allowPast?: boolean; width?: string; errorPosition?: "below" | "right" }) {
  return (
    <div className={`${width} inline-block`}>
      <UiDateInput value={value} onChange={(e) => onChange(e.target.value)} allowPastDates={allowPast} errorPosition={errorPosition} className="h-9 text-sm" />
    </div>
  )
}
