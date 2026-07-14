"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SurveyFill } from "@/components/surveys/survey-fill"

export default function SurveysPage() {
  const { getUserRole } = useAuth()
  const router = useRouter()
  const role = getUserRole()

  useEffect(() => {
    if (role === "employer") router.replace("/surveys/workers")
  }, [role, router])

  if (role === "employer") return null
  return <SurveyFill />
}
