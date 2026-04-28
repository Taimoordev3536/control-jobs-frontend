"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

interface RatePlan {
  id: number
  code: string
  label: string
  subTypes: string
  tariffType: string
  monthlyFixed: number | string
  perWorkCenter: number | string
  perWorker: number | string
  isActive: boolean
}

const COLUMN_CODES = ["PARTICULAR_HOME", "BUSINESS_STATIC", "BUSINESS_REMOTE"] as const
type ColumnCode = (typeof COLUMN_CODES)[number]

const COLUMN_LABEL: Record<ColumnCode, string> = {
  PARTICULAR_HOME: "Home",
  BUSINESS_STATIC: "Static",
  BUSINESS_REMOTE: "Remote",
}

export default function RatesPage() {
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const canEdit = hasRole("admin")

  const [plans, setPlans] = useState<Record<ColumnCode, RatePlan | null>>({
    PARTICULAR_HOME: null,
    BUSINESS_STATIC: null,
    BUSINESS_REMOTE: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const fetchPlans = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/rate-plans`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to load rate plans")
        const json = await res.json()
        const list: RatePlan[] = json.data || []
        const next: Record<ColumnCode, RatePlan | null> = {
          PARTICULAR_HOME: null,
          BUSINESS_STATIC: null,
          BUSINESS_REMOTE: null,
        }
        for (const p of list) {
          if ((COLUMN_CODES as readonly string[]).includes(p.code)) {
            next[p.code as ColumnCode] = {
              ...p,
              monthlyFixed: Number(p.monthlyFixed),
              perWorkCenter: Number(p.perWorkCenter),
              perWorker: Number(p.perWorker),
            }
          }
        }
        setPlans(next)
        setIsDirty(false)
      } catch (e: any) {
        toast({ title: e.message || "Error", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])

  const handleChange = (
    code: ColumnCode,
    field: "monthlyFixed" | "perWorkCenter" | "perWorker",
    raw: string,
  ) => {
    const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "")
    setPlans((prev) => {
      const cur = prev[code]
      if (!cur) return prev
      return { ...prev, [code]: { ...cur, [field]: cleaned } }
    })
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!session?.accessToken || !canEdit) return
    setIsSaving(true)
    try {
      for (const code of COLUMN_CODES) {
        const plan = plans[code]
        if (!plan) continue
        const body = {
          monthlyFixed: Number(plan.monthlyFixed) || 0,
          perWorkCenter: Number(plan.perWorkCenter) || 0,
          perWorker: Number(plan.perWorker) || 0,
        }
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/rate-plans/${plan.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) throw new Error(`Failed to save ${code}`)
      }
      toast({ title: t("saved") || "Saved", variant: "success" as any })
      setIsDirty(false)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const cellValue = (code: ColumnCode, field: "monthlyFixed" | "perWorkCenter" | "perWorker") => {
    const v = plans[code]?.[field]
    return v === null || v === undefined ? "" : String(v)
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{t("rates")}</h1>
          {!canEdit && (
            <p className="mt-1 text-xs text-muted-foreground">{t("readOnlyForRole") || "Read-only"}</p>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading") || "Loading..."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground"></th>
                    {COLUMN_CODES.map((code) => (
                      <th
                        key={code}
                        className="px-6 py-4 text-center text-sm font-semibold text-foreground"
                      >
                        {COLUMN_LABEL[code]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { field: "monthlyFixed",  label: t("fixedFee") },
                      { field: "perWorkCenter", label: t("workCenters") },
                      { field: "perWorker",     label: t("employees") },
                    ] as const
                  ).map((row, idx) => (
                    <tr
                      key={row.field}
                      className={`border-b border-border ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{row.label}</td>
                      {COLUMN_CODES.map((code) => (
                        <td key={code} className="px-6 py-4">
                          <Input
                            type="text"
                            value={cellValue(code, row.field)}
                            onChange={(e) => handleChange(code, row.field, e.target.value)}
                            disabled={!canEdit || !plans[code]}
                            className="text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-border">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{t("vatNotIncluded")}</p>
                <Button
                  onClick={handleSave}
                  disabled={!canEdit || !isDirty || isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" /> {t("saving") || "Saving..."}
                    </>
                  ) : (
                    t("saveChanges") || t("keep") || "Save"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
