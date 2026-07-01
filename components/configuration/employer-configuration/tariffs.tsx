"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"

export default function Tariffs() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [billing, setBilling] = useState<any>({ fixedAmount: null, hoursLabel: "Horas de servicio", hourRate: null, vatPct: 21 })
  const [salary, setSalary] = useState<any>({ fixedAmount: null, hoursLabel: "Horas de trabajo", hourRate: null })

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    fetch(`${base}/employers/me/tariffs`, { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data || j
        if (d?.billing) setBilling(d.billing)
        if (d?.salary) setSalary(d.salary)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const save = async () => {
    setSaving(true)
    try {
      const norm = (o: any, keys: string[]) => {
        const out: any = { ...o }
        keys.forEach((k) => (out[k] = out[k] === "" || out[k] == null ? null : Number(out[k])))
        return out
      }
      const res = await fetch(`${base}/employers/me/tariffs`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          billing: norm(billing, ["fixedAmount", "hourRate", "vatPct"]),
          salary: norm(salary, ["fixedAmount", "hourRate"]),
        }),
      })
      if (!res.ok) throw new Error("save failed")
      toast({ title: t("saved") || "Saved", variant: "success" as any })
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><AnimatedLoader /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-muted-foreground">{t("tariffsHint") || "Default rates applied when a client or worker has none of their own set."}</p>

      <section className="rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">{t("invoices") || "Facturas"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("fixedExpenses") || "Gastos fijos"} (€)</label>
            <Input type="number" step="0.01" value={billing.fixedAmount ?? ""} onChange={(e) => setBilling((b: any) => ({ ...b, fixedAmount: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("hoursLabel") || "Texto horas"}</label>
            <Input value={billing.hoursLabel ?? ""} onChange={(e) => setBilling((b: any) => ({ ...b, hoursLabel: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("pricePerHour") || "Precio/hora"} (€)</label>
            <Input type="number" step="0.01" value={billing.hourRate ?? ""} onChange={(e) => setBilling((b: any) => ({ ...b, hourRate: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">IVA (%)</label>
            <Input type="number" step="0.01" value={billing.vatPct ?? ""} onChange={(e) => setBilling((b: any) => ({ ...b, vatPct: e.target.value }))} className="h-9" />
          </div>
        </div>
      </section>

      <section className="rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">{t("salaries") || "Salarios"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">{t("fixedExpenses") || "Gastos fijos"} (€)</label>
            <Input type="number" step="0.01" value={salary.fixedAmount ?? ""} onChange={(e) => setSalary((s: any) => ({ ...s, fixedAmount: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("hoursLabel") || "Texto horas"}</label>
            <Input value={salary.hoursLabel ?? ""} onChange={(e) => setSalary((s: any) => ({ ...s, hoursLabel: e.target.value }))} className="h-9" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("pricePerHour") || "Precio/hora"} (€)</label>
            <Input type="number" step="0.01" value={salary.hourRate ?? ""} onChange={(e) => setSalary((s: any) => ({ ...s, hourRate: e.target.value }))} className="h-9" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
          {saving ? "…" : t("save") || "Guardar"}
        </Button>
      </div>
    </div>
  )
}
