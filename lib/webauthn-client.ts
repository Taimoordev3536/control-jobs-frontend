import { startRegistration, startAuthentication } from "@simplewebauthn/browser"

const base = () => process.env.NEXT_PUBLIC_API_BASE_URL

// The API wraps every response in { message, data, isSuccess, ... }. Unwrap `data` on
// success; on error keep the envelope so `message` is still readable.
function unwrap(j: any) {
  if (j && typeof j === "object" && "isSuccess" in j) return j.isSuccess ? j.data : j
  return j
}

async function post(path: string, token: string, body?: any) {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  return unwrap(await res.json())
}

/** Is this browser capable of platform authenticators (fingerprint / Face ID / Windows Hello)? */
export function webauthnSupported(): boolean {
  return typeof window !== "undefined" && !!(window as any).PublicKeyCredential
}

export async function webauthnStatus(token: string): Promise<{ registered: boolean }> {
  try {
    const res = await fetch(`${base()}/webauthn/status`, { headers: { Authorization: `Bearer ${token}` } })
    return res.ok ? unwrap(await res.json()) : { registered: false }
  } catch {
    return { registered: false }
  }
}

/** Enroll this device's biometric/PIN as a passkey for the current user. */
export async function registerDevice(token: string, deviceLabel?: string): Promise<{ verified: boolean; error?: string }> {
  try {
    const options = await post("/webauthn/register/options", token)
    if (options?.error) return { verified: false, error: options.error }
    const attResp = await startRegistration({ optionsJSON: options })
    return await post("/webauthn/register/verify", token, { response: attResp, deviceLabel })
  } catch (e: any) {
    return { verified: false, error: e?.message || "Registration cancelled" }
  }
}

/** Prompt the device biometric/PIN to verify identity (server-verified). */
export async function authenticateDevice(token: string): Promise<{ verified: boolean; error?: string }> {
  try {
    const options = await post("/webauthn/auth/options", token)
    if (options?.error) return { verified: false, error: options.error }
    const authResp = await startAuthentication({ optionsJSON: options })
    return await post("/webauthn/auth/verify", token, { response: authResp })
  } catch (e: any) {
    return { verified: false, error: e?.message || "Verification cancelled" }
  }
}
