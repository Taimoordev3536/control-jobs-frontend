"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { SurveyFill } from "@/components/surveys/survey-fill"

export default function SurveysPage() {
  const { getUserRole, isLoading } = useAuth()
  const router = useRouter()
  const role = getUserRole()

  useEffect(() => {
    if (role === "employer") router.replace("/surveys/workers")
  }, [role, router])

  // getUserRole() is null until the session hydrates, so rendering on that first
  // pass mounted the respondent view for EVERY role — including employers, who
  // then fired /survey-forms/mine and got a 403 before the redirect landed.
  if (isLoading || !role) return null
  if (role === "employer") return null
  return <SurveyFill />
}
