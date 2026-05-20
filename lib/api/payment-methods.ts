import { getSession } from "next-auth/react"

export interface PaymentMethodOption {
  id: number
  name: string
  description: string | null
  isSelfService: boolean
  displayOrder: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export async function listPaymentMethods(opts: {
  selfServiceOnly?: boolean
} = {}): Promise<PaymentMethodOption[]> {
  const session = await getSession()
  const token = (session as any)?.accessToken
  const params = new URLSearchParams()
  if (opts.selfServiceOnly) params.set("selfServiceOnly", "true")
  const res = await fetch(
    `${API_BASE}/payment-methods${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )
  if (!res.ok) return []
  const json = await res.json()
  return json?.data || []
}
