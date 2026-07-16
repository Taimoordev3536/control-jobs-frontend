"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { AnimatedLoader } from "@/components/animated-loader"

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
  pendingMonthlyFixed: number | string | null
  pendingPerWorkCenter: number | string | null
  pendingPerWorker: number | string | null
  pendingEffectiveAt: string | null
}

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return ""
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}

const COLUMN_CODES = ["PARTICULAR_HOME", "BUSINESS_STATIC", "BUSINESS_REMOTE"] as const
type ColumnCode = (typeof COLUMN_CODES)[number]

const COLUMN_LABEL: Record<ColumnCode, string> = {
  PARTICULAR_HOME: "Home",
  BUSINESS_STATIC: "Static",
  BUSINESS_REMOTE: "Remote",
}

export default function RatePlansManager() {
  const { t } = useTranslation()
  const { session, hasRole } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const canEdit = hasRole("admin")

  const [plans, setPlans] = useState<Record<ColumnCode, RatePlan | null>>({
    PARTICULAR_HOME: null,
    BUSINESS_STATIC: null,
    BUSINESS_REMOTE: null,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // Inputs always show the CURRENT live values (what's billed today).
  // Pending (scheduled) values appear only in the banner above so admins
  // can't confuse "what's billed now" with "what's coming."
  const { data: fetchedPlans, isLoading } = useQuery<Record<ColumnCode, RatePlan | null>>({
    queryKey: ["rate-plans"],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const json = await apiFetch<{ data: RatePlan[] }>("/rate-plans")
      const next: Record<ColumnCode, RatePlan | null> = {
        PARTICULAR_HOME: null,
        BUSINESS_STATIC: null,
        BUSINESS_REMOTE: null,
      }
      for (const p of json.data || []) {
        if ((COLUMN_CODES as readonly string[]).includes(p.code)) {
          next[p.code as ColumnCode] = {
            ...p,
            monthlyFixed: Number(p.monthlyFixed),
            perWorkCenter: Number(p.perWorkCenter),
            perWorker: Number(p.perWorker),
            pendingMonthlyFixed: p.pendingMonthlyFixed,
            pendingPerWorkCenter: p.pendingPerWorkCenter,
            pendingPerWorker: p.pendingPerWorker,
            pendingEffectiveAt: p.pendingEffectiveAt,
          }
        }
      }
      return next
    },
  })

  // Seed the editable rate inputs once loaded; re-seeds after save/cancel
  // (which invalidate). Nothing else invalidates, so in-progress edits are
  // never clobbered.
  useEffect(() => {
    if (fetchedPlans) {
      setPlans(fetchedPlans)
      setIsDirty(false)
    }
  }, [fetchedPlans])

  const loadPlans = () => queryClient.invalidateQueries({ queryKey: ["rate-plans"] })

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
        await apiFetch(`/rate-plans/${plan.id}`, {
          method: "PATCH",
          body: {
            monthlyFixed: Number(plan.monthlyFixed) || 0,
            perWorkCenter: Number(plan.perWorkCenter) || 0,
            perWorker: Number(plan.perWorker) || 0,
          },
        })
      }
      toast({ title: t("saved") || "Saved", variant: "success" as any })
      await loadPlans()
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

  const cancelPending = async (planId: number) => {
    if (!session?.accessToken || !canEdit) return
    if (!confirm(t("confirmCancelPending") || "Cancel the scheduled rate change?")) return
    try {
      await apiFetch(`/rate-plans/${planId}/cancel-pending`, { method: "POST" })
      toast({ title: t("pendingCancelled") || "Pending change cancelled", variant: "success" as any })
      await loadPlans()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const pendingPlans = COLUMN_CODES
    .map((c) => plans[c])
    .filter((p): p is RatePlan => !!p && !!p.pendingEffectiveAt)

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground">{t("rates")}</h1>
        {!canEdit && (
          <p className="mt-1 text-xs text-muted-foreground">{t("readOnlyForRole") || "Read-only"}</p>
        )}
      </div>

      {pendingPlans.length > 0 && (
        <div className="mx-6 mt-4 mb-4 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-50/40 dark:from-amber-950/40 dark:to-amber-950/10 overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t("pendingRateChange")}
              </h3>
              <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
                {t("rateChangeNotice")}
              </p>
            </div>
          </div>

          <div className="border-t border-amber-200/60 dark:border-amber-900/40 divide-y divide-amber-200/60 dark:divide-amber-900/40">
            {pendingPlans.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                    {COLUMN_LABEL[p.code as ColumnCode]}
                    <span className="inline-flex items-center gap-1 text-[11px] font-normal px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200">
                      <Calendar className="w-3 h-3" />
                      {t("effectiveFrom")} {fmtDate(p.pendingEffectiveAt)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-900/90 dark:text-amber-200/90">
                    <span>
                      {t("fixedFee")}:{" "}
                      <strong>{Number(p.pendingMonthlyFixed).toFixed(2).replace(".", ",")} €</strong>
                    </span>
                    <span>
                      {t("workCenters")}:{" "}
                      <strong>{Number(p.pendingPerWorkCenter).toFixed(2).replace(".", ",")} €</strong>
                    </span>
                    <span>
                      {t("employees")}:{" "}
                      <strong>{Number(p.pendingPerWorker).toFixed(2).replace(".", ",")} €</strong>
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => cancelPending(p.id)}
                    className="text-xs font-medium text-amber-900 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100 px-2.5 py-1 rounded border border-amber-400/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 flex items-center justify-center">
          <AnimatedLoader size={32} />
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
              {canEdit && (
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
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
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
