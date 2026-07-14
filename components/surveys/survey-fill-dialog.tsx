"use client"

import { useState } from "react"
import { ClipboardList, X, Check } from "lucide-react"
import { SurveyEntry, submitSurvey } from "@/lib/survey-client"
import { useTranslation } from "@/hooks/use-translation"

type Props = {
  open: boolean
  entry: SurveyEntry | null
  title: string
  token: string
  date?: string
  onSubmitted: () => void
  onClose: () => void
}

export default function SurveyFillDialog({ open, entry, title, token, date, onSubmitted, onClose }: Props) {
  const { t } = useTranslation("fichaje-dialogs")
  const [rating, setRating] = useState<number | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!open || !entry) return null

  const threshold = entry.rateDigit
  const needsReason = rating != null && threshold != null && rating <= threshold

  const reset = () => { setRating(null); setReason(""); setError(null); setBusy(false); setDone(false) }
  const close = () => { reset(); onClose() }

  const submit = async () => {
    if (rating == null) { setError(t("surveyFillPickRating")); return }
    if (needsReason && !reason.trim()) { setError(entry.textAlertTracking || t("surveyFillGiveReason")); return }
    setBusy(true); setError(null)
    const res = await submitSurvey(token, entry.surveyPublicId, { date, rating, reason: reason.trim() || undefined })
    setBusy(false)
    if (res.ok) {
      setDone(true)
      setTimeout(() => { reset(); onSubmitted() }, 1400)
    } else {
      setError(res.message || t("surveyFillSendFailed"))
    }
  }

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#662D91]" /> {title}
          </h3>
          <button onClick={close} className="text-muted-foreground hover:text-foreground" aria-label={t("surveyFillClose")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 grid place-items-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold">{entry.greetingText || t("surveyFillThanks")}</p>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-[15px] font-semibold text-foreground">{entry.questionText || t("surveyFillRateQuestion")}</p>

              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`aspect-square rounded-lg text-sm font-bold border transition-colors ${
                      rating === n
                        ? "bg-[#662D91] text-white border-[#662D91]"
                        : "bg-muted/50 text-foreground border-border hover:border-[#662D91]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                <span>{t("surveyFillNotSatisfied")}</span>
                <span>{t("surveyFillVerySatisfied")}</span>
              </div>

              {needsReason && (
                <div>
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {entry.textAlertTracking || t("surveyFillReasonLabel")}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#662D91]/40"
                    placeholder={t("surveyFillReasonPlaceholder")}
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-2 px-5 pb-5 pt-1">
              <button onClick={close} disabled={busy} className="flex-1 h-11 rounded-xl bg-muted text-foreground text-sm font-bold disabled:opacity-50">
                {t("surveyFillCancel")}
              </button>
              <button onClick={submit} disabled={busy} className="flex-1 h-11 rounded-xl bg-[#662D91] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                {busy ? t("surveyFillSending") : t("surveyFillSend")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
