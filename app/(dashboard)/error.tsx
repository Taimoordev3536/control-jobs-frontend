"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"

/**
 * Route-level error boundary for every /(dashboard) page. Next.js renders this
 * (inside the persistent layout — sidebar and header stay put) whenever a page
 * throws during render, instead of blanking to the raw "Application error"
 * overlay. `reset()` re-renders the failed segment so a transient error can be
 * retried without a full reload.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation()
  const router = useRouter()

  useEffect(() => {
    // The message is minified in production; log it so it's still inspectable.
    console.error("Dashboard route error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
          <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("somethingWentWrong") || "Algo ha ido mal"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("errorPageDescription") ||
            "No hemos podido cargar esta página. Inténtalo de nuevo."}
        </p>

        {error?.digest && (
          <p className="mt-2 text-xs text-muted-foreground/70 font-mono">
            {t("errorReference") || "Referencia"}: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={() => reset()} className="w-full sm:w-auto">
            {t("tryAgain") || "Reintentar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto"
          >
            {t("backToDashboard") || "Volver al panel"}
          </Button>
        </div>
      </div>
    </div>
  )
}
