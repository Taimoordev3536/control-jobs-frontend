const base = () => process.env.NEXT_PUBLIC_API_BASE_URL

function unwrap(j: any) {
  if (j && typeof j === "object" && "isSuccess" in j) return j.isSuccess ? j.data : j
  return j
}

export type SurveyResponseView = {
  rating: number | null
  comment: string | null
  submittedAt: string
  by: string | null
}

export type SurveyEntry = {
  surveyPublicId: string
  questionText: string | null
  rateDigit: number | null
  textAlertTracking: string | null
  greetingText: string | null
  periodicity: string
  periodKey: string
  filled: boolean
  response: SurveyResponseView | null
  canFill: boolean
}

export type SurveyStatus = {
  date: string
  worker: SurveyEntry | null
  customer: SurveyEntry | null
}

export async function surveyStatus(token: string, jobId: string, date?: string): Promise<SurveyStatus | null> {
  try {
    const q = new URLSearchParams({ jobId, ...(date ? { date } : {}) })
    const res = await fetch(`${base()}/surveys/status?${q}`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? unwrap(await res.json()) : null
  } catch {
    return null
  }
}

export async function submitSurvey(
  token: string,
  surveyPublicId: string,
  body: { date?: string; rating: number; reason?: string },
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${base()}/surveys/${surveyPublicId}/response`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const j = await res.json()
    if (res.ok && (j?.isSuccess ?? true)) return { ok: true, message: j?.message }
    return { ok: false, message: j?.message || "No se pudo enviar la encuesta" }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Error de red" }
  }
}
