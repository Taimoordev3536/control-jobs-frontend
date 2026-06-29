"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"

interface AccountingConfig {
  companyName: string
  address: string
  vatRate: number
  invoiceSeries: string
  paymentDetails: string
  ivaTextParticularesTai: string
  ivaTextAutonomosFueraTai: string
  iban: string
  swiftBic: string
  paypal: string
}

const emptyConfig: AccountingConfig = {
  companyName: "",
  address: "",
  vatRate: 21,
  invoiceSeries: "CJOBS",
  paymentDetails: "",
  ivaTextParticularesTai: "",
  ivaTextAutonomosFueraTai: "",
  iban: "",
  swiftBic: "",
  paypal: "",
}

export default function Accounting() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const [config, setConfig] = useState<AccountingConfig>(emptyConfig)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/config`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const d = await res.json()
          if (d && !cancelled) {
            setConfig({
              companyName: d.companyName ?? "",
              address: d.address ?? "",
              vatRate: d.vatRate != null ? Number(d.vatRate) : 21,
              invoiceSeries: d.invoiceSeries ?? "CJOBS",
              paymentDetails: d.paymentDetails ?? "",
              ivaTextParticularesTai: d.ivaTextParticularesTai ?? "",
              ivaTextAutonomosFueraTai: d.ivaTextAutonomosFueraTai ?? "",
              iban: d.iban ?? "",
              swiftBic: d.swiftBic ?? "",
              paypal: d.paypal ?? "",
            })
          }
        }
      } catch {
        /* no existing config yet — keep defaults */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session?.accessToken])

  const set = (key: keyof AccountingConfig, value: string | number) =>
    setConfig((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!session?.accessToken) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ ...config, vatRate: Number(config.vatRate) }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast({ title: t("savedSuccessfully") || "Saved successfully" })
    } catch (err) {
      console.error("Error saving accounting config:", err)
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <AnimatedLoader size={32} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("vatPercent") || "% I.V.A."}</Label>
        <Input
          type="number"
          step="0.01"
          value={config.vatRate}
          onChange={(e) => set("vatRate", e.target.value === "" ? 0 : Number(e.target.value))}
          className="w-40"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("ivaTextParticularesTai") || "Texto sobre el IVA en facturas a Particulares de la zona TAI"}
        </Label>
        <Textarea
          rows={3}
          value={config.ivaTextParticularesTai}
          onChange={(e) => set("ivaTextParticularesTai", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t("ivaTextAutonomosFueraTai") ||
            "Texto sobre el IVA en facturas a Autónomos/Empresas de fuera de la zona TAI"}
        </Label>
        <Textarea
          rows={3}
          value={config.ivaTextAutonomosFueraTai}
          onChange={(e) => set("ivaTextAutonomosFueraTai", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("ibanAccount") || "Cta. IBAN"}</Label>
          <Input value={config.iban} onChange={(e) => set("iban", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("swiftBic") || "SWIFT / BIC"}</Label>
          <Input value={config.swiftBic} onChange={(e) => set("swiftBic", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("paypal") || "PayPal"}</Label>
          <Input value={config.paypal} onChange={(e) => set("paypal", e.target.value)} />
        </div>
      </div>

      <div className="pt-2">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8"
        >
          {saving ? t("saving") || "Saving..." : t("save") || "Save"}
        </Button>
      </div>
    </div>
  )
}
