"use client"

import { useEffect, useState } from "react"
import { MapPin, ShieldCheck, ShieldOff, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { locationConsentStatus, revokeLocationConsent, LocationConsentStatus } from "@/lib/consent-client"

/** GDPR — lets the worker see and withdraw their location-tracking consent (art. 7.3 RGPD). */
export default function PrivacyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth() as any
  const { toast } = useToast()
  const { t } = useTranslation("fichaje-dialogs")
  const [status, setStatus] = useState<LocationConsentStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !session?.accessToken) return
    locationConsentStatus(session.accessToken).then(setStatus).catch(() => {})
  }, [open, session?.accessToken])

  const revoke = async () => {
    setBusy(true)
    const res = await revokeLocationConsent(session?.accessToken || "")
    setBusy(false)
    setStatus(res)
    toast({
      title: t("privacyRevokedTitle"),
      description: t("privacyRevokedDesc"),
    })
  }

  if (!open) return null

  const granted = !!status?.granted
  const grantedDate = status?.grantedAt
    ? new Date(status.grantedAt).toLocaleDateString(t("privacyDateLocale"), { day: "numeric", month: "short", year: "numeric" })
    : null
  const grantedDesc = `${t("privacyGrantedDesc")}${grantedDate ? `${t("privacyGrantedSince")}${grantedDate}` : ""}.`

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#662D91]" /> {t("privacyTitle")}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label={t("privacyClose")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
            {granted ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <ShieldOff className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              {granted ? (
                <>
                  <div className="text-sm font-semibold text-foreground">{t("privacyGrantedTitle")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {grantedDesc}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-foreground">{t("privacyNoConsentTitle")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("privacyNoConsentDesc")}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>{t("privacyBullet1")}</p>
            <p>{t("privacyBullet2")}</p>
            <p>{t("privacyBullet3")}</p>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-1">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-muted text-foreground text-sm font-bold">
            {t("privacyClose")}
          </button>
          {granted && (
            <button
              onClick={revoke}
              disabled={busy}
              className="flex-1 h-11 rounded-xl border border-red-300 text-red-600 text-sm font-bold hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 disabled:opacity-50"
            >
              {busy ? t("privacyRevoking") : t("privacyRevoke")}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
