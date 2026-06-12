"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import InvoiceForm from "@/components/invoice-form"
import { AnimatedLoader } from "@/components/animated-loader"
import { apiFetch } from "@/lib/api"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"

interface AddInvoicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { periodStart: `${ym}-01`, periodEnd: `${ym}-${String(lastDay).padStart(2, "0")}` }
}

export default function AddInvoicesModal({ open, onOpenChange, onCreated }: AddInvoicesModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [employers, setEmployers] = useState<{ id: number; name: string }[]>([])
  const [employerId, setEmployerId] = useState("")
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [preview, setPreview] = useState<any | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [invoicedMonths, setInvoicedMonths] = useState<string[]>([])

  const { periodStart, periodEnd } = useMemo(() => monthBounds(month), [month])
  const alreadyInvoiced = invoicedMonths.includes(month)

  useEffect(() => {
    if (!open) {
      setEmployerId("")
      setPreview(null)
      return
    }
    apiFetch<{ data: any[] }>("/employers")
      .then((j) => setEmployers((j.data || []).map((e) => ({ id: e.id, name: e.name }))))
      .catch(() => setEmployers([]))
  }, [open])

  useEffect(() => {
    if (!open || !employerId) {
      setInvoicedMonths([])
      return
    }
    apiFetch<{ data: string[] }>(`/invoices/invoiced-months?employerId=${employerId}`)
      .then((j) => setInvoicedMonths(j.data || []))
      .catch(() => setInvoicedMonths([]))
  }, [open, employerId])

  useEffect(() => {
    if (!open || !employerId || !month) {
      setPreview(null)
      return
    }
    setLoadingPreview(true)
    apiFetch<{ data: any }>("/invoices/generate-preview", {
      method: "POST",
      body: { employerId: Number(employerId), periodStart, periodEnd },
    })
      .then((j) => setPreview(j.data))
      .catch((e) => {
        setPreview(null)
        toast({ title: e.message || "Error", variant: "destructive" })
      })
      .finally(() => setLoadingPreview(false))
  }, [open, employerId, month, periodStart, periodEnd])

  const generate = async (payload: {
    workCenterIds: number[]
    workerIds: number[]
    fixedFee: number
    discountPct: number
    chargeDate: string
  }) => {
    if (!employerId || alreadyInvoiced) return
    setGenerating(true)
    try {
      const res = await apiFetch<{ data: any }>("/invoices/generate", {
        method: "POST",
        body: { employerId: Number(employerId), periodStart, periodEnd, ...payload },
      })
      toast({ title: t("invoiceCreated") || "Invoice created", variant: "success" as any })
      onCreated?.()
      onOpenChange(false)
      if (res.data?.publicId) router.push(`/invoices/${res.data.publicId}`)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <h2>{t("generateInvoice") || "Generate invoice"}</h2>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-1 min-w-[240px]">
            <label className="text-xs font-medium text-muted-foreground">{t("employer") || "Empleador"}</label>
            <Select value={employerId} onValueChange={setEmployerId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("selectAnEmployer") || "Select an employer"} />
              </SelectTrigger>
              <SelectContent>
                {employers.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{t("period") || "Periodo"}</label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-44" />
          </div>
          {employerId && (
            <div className="w-full text-xs space-y-1">
              {alreadyInvoiced ? (
                <p className="text-red-600 font-medium">
                  {t("monthAlreadyInvoiced") || "This month is already invoiced for this employer."}
                </p>
              ) : invoicedMonths.length > 0 ? (
                <p className="text-muted-foreground">
                  {t("alreadyInvoicedMonths") || "Already invoiced"}: {invoicedMonths.join(", ")}
                </p>
              ) : null}
              {preview && (
                <p className="text-muted-foreground italic">
                  {t("countsAsOfNow") ||
                    "Worker and work-center counts reflect the employer's current active records."}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="min-h-[200px] overflow-x-auto">
          {loadingPreview ? (
            <div className="flex items-center justify-center py-20">
              <AnimatedLoader />
            </div>
          ) : alreadyInvoiced ? (
            <div className="py-20 text-center text-sm text-red-600">
              {t("monthAlreadyInvoiced") || "This month is already invoiced for this employer."}
            </div>
          ) : preview ? (
            <InvoiceForm mode="generate" invoice={preview} onGenerate={generate} generating={generating} onCancel={() => onOpenChange(false)} />
          ) : (
            <div className="py-20 text-center text-sm text-muted-foreground">
              {t("selectEmployerToPreview") || "Select an employer and period to preview the invoice"}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
