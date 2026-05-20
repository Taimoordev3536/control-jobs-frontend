"use client"

import { useEffect, useState } from "react"
import {
  listPaymentMethods,
  type PaymentMethodOption,
} from "@/lib/api/payment-methods"

interface Options {
  selfServiceOnly?: boolean
  enabled?: boolean
}

export function usePaymentMethods({ selfServiceOnly = false, enabled = true }: Options = {}) {
  const [methods, setMethods] = useState<PaymentMethodOption[]>([])
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    listPaymentMethods({ selfServiceOnly })
      .then((rows) => {
        if (!cancelled) setMethods(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selfServiceOnly, enabled])

  return { methods, loading }
}
