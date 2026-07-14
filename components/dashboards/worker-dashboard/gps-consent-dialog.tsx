"use client"

import { MapPin, ShieldCheck, X } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

type Props = {
  open: boolean
  /** worker agreed — record consent and continue with the location capture */
  onAccept: () => void
  /** worker declined — abort the location capture */
  onDecline: () => void
  busy?: boolean
}

/**
 * GDPR consent for geolocation capture during check-in. Shown once before the first
 * location is read; the choice is persisted server-side so it isn't asked again.
 */
export default function GpsConsentDialog({ open, onAccept, onDecline, busy }: Props) {
  const { t } = useTranslation("fichaje-dialogs")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#662D91]" /> {t("gpsConsentTitle")}
          </h3>
          <button onClick={onDecline} className="text-muted-foreground hover:text-foreground" aria-label={t("gpsConsentClose")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            {t("gpsConsentIntroPre")}
            <b className="text-foreground">{t("gpsConsentIntroBold")}</b>
            {t("gpsConsentIntroPost")}
          </p>

          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#662D91] mt-0.5 shrink-0" />
              <span><b className="text-foreground">{t("gpsConsentWhatLabel")}</b>{t("gpsConsentWhat")}</span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#662D91] mt-0.5 shrink-0" />
              <span><b className="text-foreground">{t("gpsConsentWhyLabel")}</b>{t("gpsConsentWhy")}</span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#662D91] mt-0.5 shrink-0" />
              <span><b className="text-foreground">{t("gpsConsentLegalLabel")}</b>{t("gpsConsentLegal")}</span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#662D91] mt-0.5 shrink-0" />
              <span><b className="text-foreground">{t("gpsConsentRetentionLabel")}</b>{t("gpsConsentRetention")}</span>
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#662D91] mt-0.5 shrink-0" />
              <span><b className="text-foreground">{t("gpsConsentRightsLabel")}</b>{t("gpsConsentRights")}</span>
            </li>
          </ul>

          <p className="text-xs text-muted-foreground">
            {t("gpsConsentFooter")}
          </p>
        </div>

        <div className="flex gap-2 px-5 pb-5 pt-1">
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-muted text-foreground text-sm font-bold disabled:opacity-50"
          >
            {t("gpsConsentDecline")}
          </button>
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-[#662D91] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {busy ? t("gpsConsentSaving") : t("gpsConsentAccept")}
          </button>
        </div>
      </div>
    </div>
  )
}
