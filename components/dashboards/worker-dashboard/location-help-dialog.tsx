"use client"

import { MapPin, X, RotateCw, QrCode, Wifi, AlertTriangle } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export type LocationErrorReason = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout"
export type LocationHelpChoice = "retry" | "continue" | "cancel"

type Props = {
  open: boolean
  reason: LocationErrorReason
  busy?: boolean
  onChoice: (choice: LocationHelpChoice) => void
}

const headKeyByReason: Record<LocationErrorReason, string> = {
  denied: "locHelpHeadDenied",
  insecure: "locHelpHeadInsecure",
  unsupported: "locHelpHeadUnsupported",
  unavailable: "locHelpHeadUnavailable",
  timeout: "locHelpHeadTimeout",
}

const subKeyByReason: Record<LocationErrorReason, string> = {
  denied: "locHelpSubDenied",
  insecure: "locHelpSubInsecure",
  unsupported: "locHelpSubUnsupported",
  unavailable: "locHelpSubUnavailable",
  timeout: "locHelpSubTimeout",
}

/** Browser-specific unblock steps. */
function browserSteps(t: (key: string) => string): string[] {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  const prefix = /Firefox\//.test(ua) ? "locHelpStepsFirefox" : "locHelpStepsChrome"
  return [1, 2, 3, 4].map((n) => t(`${prefix}${n}`))
}

export default function LocationHelpDialog({ open, reason, busy, onChoice }: Props) {
  const { t } = useTranslation("fichaje-dialogs")

  if (!open) return null
  const showSteps = reason === "denied"

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#662D91]" /> {t("locHelpTitle")}
          </h3>
          <button onClick={() => onChoice("cancel")} className="text-muted-foreground hover:text-foreground" aria-label={t("locHelpClose")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">{t(headKeyByReason[reason])}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t(subKeyByReason[reason])}</p>
            </div>
          </div>

          {showSteps && (
            <ol className="space-y-2 text-sm">
              {browserSteps(t).map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#662D91] text-white text-xs font-bold inline-flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-xl border border-border p-3 flex items-start gap-2.5">
            <div className="flex gap-1.5 mt-0.5 shrink-0">
              <QrCode className="w-4 h-4 text-[#662D91]" />
              <Wifi className="w-4 h-4 text-[#662D91]" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("locHelpAltHelpPre")}
              <b className="text-foreground">{t("locHelpAltHelpQr")}</b>
              {t("locHelpAltHelpMid")}
              <b className="text-foreground">{t("locHelpAltHelpIp")}</b>
              {t("locHelpAltHelpPost")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 px-5 pb-5 pt-1">
          <button
            onClick={() => onChoice("continue")}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-muted text-foreground text-sm font-bold disabled:opacity-50"
          >
            {t("locHelpContinueWithout")}
          </button>
          <button
            onClick={() => onChoice("retry")}
            disabled={busy}
            className="flex-1 h-11 rounded-xl bg-[#662D91] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <RotateCw className="w-4 h-4" /> {busy ? t("locHelpChecking") : t("locHelpRetry")}
          </button>
        </div>
      </div>
    </div>
  )
}
