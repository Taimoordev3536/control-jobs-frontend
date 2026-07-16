"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Megaphone, Info, AlertTriangle } from "lucide-react"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDateTime } from "@/lib/datetime"

export default function ReceivedAnnouncements() {
  const { t } = useTranslation()
  const { status } = useSession()

  const { data: items = [], isLoading: loading } = useQuery<any[]>({
    queryKey: ["alerts", "announcements"],
    queryFn: async () => {
      const j = await apiFetch<any>("/alerts/announcements")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: status === "authenticated",
  })

  const sev = (s: string) =>
    s === "CRITICAL"
      ? { c: "text-red-600 dark:text-red-400", I: AlertTriangle }
      : s === "WARNING"
        ? { c: "text-amber-600 dark:text-amber-400", I: AlertTriangle }
        : { c: "text-[#662D91]", I: Info }

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-4">
      <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-[#662D91]" />
        {t("announcements") || "Comunicados"}
      </h1>
      {loading ? (
        <div className="flex justify-center py-12"><AnimatedLoader /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8">{t("noAnnouncements") || "No tienes comunicados."}</p>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          {items.map((a) => {
            const s = sev(a.severity)
            const I = s.I
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                <I className={`h-5 w-5 shrink-0 mt-0.5 ${s.c}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{a.subject || t("announcement") || "Comunicado"}</div>
                  <div className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{a.body}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{formatLocalDateTime(a.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
