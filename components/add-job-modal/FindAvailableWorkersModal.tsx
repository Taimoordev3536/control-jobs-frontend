"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"

interface FindAvailableWorkersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startDate?: string
  endDate?: string
  selectedIds: string[]
  onToggle: (workerId: string) => void
}

export default function FindAvailableWorkersModal({
  open,
  onOpenChange,
  startDate,
  endDate,
  selectedIds,
  onToggle,
}: FindAvailableWorkersModalProps) {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [onlyAvailable, setOnlyAvailable] = useState(true)

  useEffect(() => {
    if (!open || !session?.accessToken) return
    setLoading(true)
    const qs = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ""
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/find-available${qs}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((j) => setWorkers(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false))
  }, [open, session?.accessToken, startDate, endDate])

  const q = query.trim().toLowerCase()
  const filtered = workers.filter((w) => {
    if (onlyAvailable && !w.available) return false
    if (!q) return true
    return [w.name, w.occupation, w.locality].some((f) => (f || "").toLowerCase().includes(q))
  })

  const hasDates = !!startDate && !!endDate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <h2 className="text-base font-semibold">{t("findAvailableWorkers") || "Find available workers"}</h2>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder={t("searchWorkerPlaceholder") || "Search by name, city, profession..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[200px] h-9"
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} className="scale-[0.7]" />
            {t("onlyAvailable") || "Only available"}
          </label>
        </div>

        {!hasDates && (
          <p className="text-xs text-amber-600">
            {t("setJobDatesFirst") || "Set the job start and end dates to check availability."}
          </p>
        )}

        <div className="min-h-[200px]">
          {loading ? (
            <div className="flex justify-center py-10">
              <AnimatedLoader />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">{t("noWorkersFound") || "No workers found"}</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((w) => {
                const wid = String(w.publicId ?? w.id)
                return (
                <li key={wid} className="flex items-center gap-3 py-2">
                  <Checkbox checked={selectedIds.includes(wid)} onCheckedChange={() => onToggle(wid)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{w.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[w.occupation, w.locality].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                      w.available
                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    }`}
                  >
                    {w.available ? t("available") || "Available" : t("busy") || "Busy"}
                  </span>
                </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)} className="bg-[#662D91] hover:bg-[#532073] text-white">
            {t("done") || "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
