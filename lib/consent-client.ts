const base = () => process.env.NEXT_PUBLIC_API_BASE_URL

// The API wraps responses in { message, data, isSuccess, ... }; unwrap `data` on success.
function unwrap(j: any) {
  if (j && typeof j === "object" && "isSuccess" in j) return j.isSuccess ? j.data : j
  return j
}

export type LocationConsentStatus = { granted: boolean; version?: string; grantedAt?: string | null }

export async function locationConsentStatus(token: string): Promise<LocationConsentStatus> {
  try {
    const res = await fetch(`${base()}/consent/location`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? unwrap(await res.json()) : { granted: false }
  } catch {
    return { granted: false }
  }
}

export async function grantLocationConsent(token: string): Promise<LocationConsentStatus> {
  try {
    const res = await fetch(`${base()}/consent/location`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    })
    return res.ok ? unwrap(await res.json()) : { granted: false }
  } catch {
    return { granted: false }
  }
}

export async function revokeLocationConsent(token: string): Promise<LocationConsentStatus> {
  try {
    const res = await fetch(`${base()}/consent/location`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.ok ? unwrap(await res.json()) : { granted: true }
  } catch {
    return { granted: true }
  }
}
