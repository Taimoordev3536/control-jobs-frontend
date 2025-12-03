"use client"

import { Info } from "lucide-react"
import InterIcon from "../../icons/alerts/Entrada.svg"
import ExitIcon from "../../icons/alerts/Salida.svg"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useTranslation } from "@/hooks/use-translation"
import { FormData } from "./types"

interface AlertsFormProps {
  formData: FormData
  delayTooltipOpen: boolean
  setDelayTooltipOpen: (open: boolean) => void
  durationTooltipOpen: boolean
  setDurationTooltipOpen: (open: boolean) => void
  updateNestedFormData: (parent: string, field: string, value: any) => void
}

export default function AlertsForm({
  formData,
  delayTooltipOpen,
  setDelayTooltipOpen,
  durationTooltipOpen,
  setDurationTooltipOpen,
  updateNestedFormData,
}: AlertsFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-8 underline text-foreground">{t("alerts") || "Alerts"}</h3>

      <div className="grid grid-cols-2 gap-12">
        {/* Entrance */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3">
              <InterIcon className="w-12 h-12 text-foreground" />
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("entrance") || "Entrance"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 ">
              <Checkbox
                id="entrance-signing"
                checked={formData.entrance.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "whenSigningIn", checked)}
              />
              <Label htmlFor="entrance-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "Al fichar"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-delay"
                className="mt-3"
                checked={formData.entrance.delay}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "delay", checked)}
              />
              <Label htmlFor="entrance-delay" className="text-sm text-foreground flex items-center mt-3">
                {t("delay") || "Retraso"}
                <TooltipProvider>
                  <Tooltip open={delayTooltipOpen} onOpenChange={setDelayTooltipOpen} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center p-0 ml-2" aria-label="Delay tips" onClick={() => setDelayTooltipOpen(!delayTooltipOpen)} tabIndex={-1}>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-xs">
                      {t("delayTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>

              {formData.entrance.delay && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.entrance.delayValue}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = Number(raw)
                      if (raw === "") return updateNestedFormData("entrance", "delayValue", "")
                      if (Number.isNaN(n)) return
                      const clamped = Math.max(0, Math.min(180, Math.floor(n)))
                      updateNestedFormData("entrance", "delayValue", String(clamped))
                    }}
                    className="ml-2 w-20 h-8 bg-background border-input text-sm"
                    placeholder="10"
                  />
                  <span className="text-sm text-muted-foreground">{t("minutes") || "minutos"}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Exit */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3">
              <ExitIcon className="w-12 h-12 text-foreground" />
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("exit") || "Exit"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 ">
              <Checkbox
                id="exit-signing"
                checked={formData.exit.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("exit", "whenSigningIn", checked)}
              />
              <Label htmlFor="exit-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "Al fichar"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-duration"
                className="mt-3"
                checked={formData.exit.duration}
                onCheckedChange={(checked) => updateNestedFormData("exit", "duration", checked)}
              />
              <Label htmlFor="exit-duration" className="text-sm text-foreground flex items-center mt-3">
                {t("duration") || "Duración"}
                <TooltipProvider>
                  <Tooltip open={durationTooltipOpen} onOpenChange={setDurationTooltipOpen} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center p-0 ml-1" aria-label="Duration tips" onClick={() => setDurationTooltipOpen(!durationTooltipOpen)} tabIndex={-1}>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-xs">
                      {t("durationTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>

              {formData.exit.duration && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={180}
                    value={formData.exit.durationValue}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = Number(raw)
                      if (raw === "") return updateNestedFormData("exit", "durationValue", "")
                      if (Number.isNaN(n)) return
                      const clamped = Math.max(0, Math.min(180, Math.floor(n)))
                      updateNestedFormData("exit", "durationValue", String(clamped))
                    }}
                    className="ml-2 w-20 h-8 bg-background border-input text-sm"
                    placeholder="00"
                  />
                  <span className="text-sm text-muted-foreground">{t("minutes") || "minutos"}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
