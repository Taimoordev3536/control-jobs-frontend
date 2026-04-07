"use client"

import { useContext } from "react"
import { Check, X } from "lucide-react"

import { LanguageContext } from "@/components/language-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const HEADLINES: Record<string, { success: string; error: string }> = {
  en: { success: "Success!", error: "Error!" },
  es: { success: "¡Éxito!", error: "¡Error!" },
  de: { success: "Erfolg!", error: "Fehler!" },
}

export function Toaster() {
  const { toasts } = useToast()
  const { language } = useContext(LanguageContext)
  const headlines = HEADLINES[language] ?? HEADLINES.es

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const isSuccess = variant === "success"
        const isDestructive = variant === "destructive"

        const icon = isSuccess ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
        ) : isDestructive ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500">
            <X className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
        ) : null

        // For semantic variants, inject a fixed headline and demote
        // the caller's title/description into the gray body text.
        const headline = isSuccess
          ? headlines.success
          : isDestructive
          ? headlines.error
          : null

        const bodyLines: React.ReactNode[] = []
        if (headline) {
          if (title) bodyLines.push(title)
          if (description) bodyLines.push(description)
        }

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3">
              {icon}
              <div className="grid gap-0.5">
                {headline ? (
                  <>
                    <ToastTitle>{headline}</ToastTitle>
                    {bodyLines.length > 0 && (
                      <ToastDescription>
                        {bodyLines.map((line, i) => (
                          <span key={i} className="block">
                            {line}
                          </span>
                        ))}
                      </ToastDescription>
                    )}
                  </>
                ) : (
                  <>
                    {title && <ToastTitle>{title}</ToastTitle>}
                    {description && (
                      <ToastDescription>{description}</ToastDescription>
                    )}
                  </>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
