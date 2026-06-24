"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"

export default function SupportSuggestionsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSuggestions = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/support/suggestions`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) throw new Error("Failed to fetch suggestions")
      const data = await res.json()
      setSuggestions(
        (data.data || []).map((r: any) => ({
          id: r.publicId || r.id,
          date: formatLocalDateTime(r.createdAt),
          requester: r.requesterName || "-",
          role: r.requesterRole || "-",
          message: r.message || "-",
        })),
      )
    } catch (err) {
      console.error("Error fetching suggestions:", err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "requester", label: t("requester"), sortable: true },
    { key: "role", label: t("role"), sortable: true },
    { key: "message", label: t("message"), sortable: false },
  ]

  return (
    <DataListTemplate
      title={t("suggestions")}
      data={suggestions}
      columns={columns}
      defaultSortColumn="date"
      defaultSortDirection="desc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noSuggestionsFound") || "No suggestions found"}
    />
  )
}
