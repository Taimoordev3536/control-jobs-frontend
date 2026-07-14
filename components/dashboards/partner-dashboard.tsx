"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import EmployerIcon from "../../icons/Menu/employer.svg"
import InviteIcon from "../../icons/Menu/Invite.svg"
import ComisionesIcon from "../../icons/new/Comisiones.svg"
import PaymentIcon from "../../icons/new/pagos.svg"
import RateIcon from "../../icons/new/Tarifas.svg"
import MarketingIcon from "../../icons/new_icons/Marketing.svg"
import { Card } from "@/components/ui/card"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"
import { AttentionCard, ActionButton, SectionLabel, ListPanel, ListRow, RowAvatar, StatusChip } from "./dashboard-widgets"

const fmtEur = (n: number) => `${(Number(n) || 0).toFixed(2)} €`

const isActive = (s: string) => s === "ACTIVE" || s === "TRIAL"
const employerChipCls = (s: string) =>
  isActive(s)
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : s === "AWAITING_PAYMENT_METHOD"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-muted text-muted-foreground"

export default function PartnerDashboard() {
  const { t, language } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.accessToken) return
    apiFetch<any>("/dashboard/partner")
      .then((j) => setData(j.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const name = (session?.user as any)?.name || "Partner"
  const localeMap: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE" }
  const today = new Date().toLocaleDateString(localeMap[language] || "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const b = data?.business || {}
  const a = data?.attention || {}

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <AnimatedLoader />
      </div>
    )
  }

  return (
    <div className="w-full p-4 bg-background min-h-screen space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("hello") || "Hello"}, {name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
        </div>
        {data?.tier && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E4D5F3] dark:border-purple-900 bg-[#F2EAFA] dark:bg-purple-950/40 text-[#4A1F6B] dark:text-purple-300 font-bold text-sm px-4 py-2">
            ◆ {data.tier}
          </span>
        )}
      </div>

      <section className="space-y-3">
        <SectionLabel>{t("yourBusiness") || "Your business · this month"}</SectionLabel>
        <Card className="border border-border bg-card overflow-hidden rounded-2xl shadow-[0_2px_10px_-4px_rgba(30,20,40,.1)] dark:shadow-black/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-5 flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 bg-[#F2EAFA] dark:bg-purple-950/40">
                <ComisionesIcon className="h-5 w-5 text-[#662D91] dark:text-purple-300" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-[#662D91] dark:text-purple-300 tabular-nums leading-none">{fmtEur(b.commissionThisMonth)}</div>
                <div className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("commissionThisMonth") || "Commission this month"}</div>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 bg-amber-100 dark:bg-amber-950/40">
                <PaymentIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-none">{fmtEur(b.pendingCollection)}</div>
                <div className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("pendingCollection") || "Pending collection"}</div>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0 bg-emerald-100 dark:bg-emerald-950/40">
                <EmployerIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{b.activeEmployers ?? 0}</div>
                <div className="mt-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("activeEmployers") || "Active employers"}</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("needsAttention") || "Needs your attention"}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AttentionCard value={a.pendingInvitations} label={t("pendingInvitations") || "Pending invitations"} Icon={InviteIcon} tone="warn" onClick={() => router.push("/employers")} />
          <AttentionCard value={a.commissionToCollect} label={t("commissionToCollect") || "Commission to collect"} Icon={ComisionesIcon} tone="info" onClick={() => router.push("/commissions")} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("quickActions") || "Quick actions"}</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <ActionButton primary Icon={InviteIcon} label={t("inviteEmployer") || "Invite employer"} onClick={() => router.push("/utilities/invite")} />
          <ActionButton Icon={ComisionesIcon} label={t("myCommissions") || "My commissions"} onClick={() => router.push("/commissions")} />
          <ActionButton Icon={RateIcon} label={t("rates") || "Rates"} onClick={() => router.push("/rates")} />
          <ActionButton Icon={MarketingIcon} label={t("marketing") || "Marketing"} onClick={() => router.push("/utilities/marketing")} />
        </div>
      </section>

      <section className="space-y-3">
        <ListPanel title={t("yourEmployers") || "Your employers"} actionLabel={t("viewAll") || "View all"} onAction={() => router.push("/employers")}>
          {(data?.employers || []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">—</div>
          ) : (
            (data.employers).map((e: any) => (
              <ListRow
                key={e.id}
                onClick={() => router.push("/employers")}
                avatar={<RowAvatar><EmployerIcon className="h-5 w-5" /></RowAvatar>}
                title={e.name}
                subtitle={[e.sector, e.at ? formatLocalDate(e.at) : null].filter(Boolean).join(" · ")}
                right={
                  <StatusChip className={employerChipCls(e.status)}>
                    {isActive(e.status) ? (t("active") || "Active") : (t("inactive") || "Inactive")}
                  </StatusChip>
                }
              />
            ))
          )}
        </ListPanel>
      </section>
    </div>
  )
}
