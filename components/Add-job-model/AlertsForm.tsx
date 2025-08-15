"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Info } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface AlertsFormProps {
  formData: any
  updateNestedFormData: (parent: string, field: string, value: any) => void
}

export function AlertsForm({ formData, updateNestedFormData }: AlertsFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-8 underline text-foreground">
        {t("alerts") || "Alerts"}
      </h3>

      <div className="grid grid-cols-2 gap-12">
        {/* Entrance */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3">
              <div className="w-12 h-12 border-2 border-foreground rounded-lg flex items-center justify-center relative bg-background">
                <div className="absolute left-1 w-3 h-3 bg-foreground rounded-full">
                  <div className="w-1 h-1 bg-background rounded-full mt-1 ml-1"></div>
                </div>
                <div className="ml-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-foreground"
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <h4 className="font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded">
              {t("entrance") || "Entrance"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-signing"
                checked={formData.entrance.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "whenSigningIn", checked)}
              />
              <Label htmlFor="entrance-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "When signing in"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-delay"
                checked={formData.entrance.delay}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "delay", checked)}
              />
              <Label htmlFor="entrance-delay" className="text-sm text-foreground">
                {t("delay") || "Delay"} <Info className="w-4 h-4 inline ml-1 text-muted-foreground" />
              </Label>
            </div>
          </div>
        </div>

        {/* Exit */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3">
              <div className="w-12 h-12 border-2 border-foreground rounded-lg flex items-center justify-center relative bg-background">
                <div className="absolute right-1 w-3 h-3 bg-foreground rounded-full">
                  <div className="w-1 h-1 bg-background rounded-full mt-1 ml-1"></div>
                </div>
                <div className="mr-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-foreground"
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <h4 className="font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded">
              {t("exit") || "Exit"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-signing"
                checked={formData.exit.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("exit", "whenSigningIn", checked)}
              />
              <Label htmlFor="exit-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "When signing in"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-duration"
                checked={formData.exit.duration}
                onCheckedChange={(checked) => updateNestedFormData("exit", "duration", checked)}
              />
              <Label htmlFor="exit-duration" className="text-sm text-foreground">
                {t("duration") || "Duration"} <Info className="w-4 h-4 inline ml-1 text-muted-foreground" />
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mt-8">
        <div>
          <Label className="text-sm font-medium text-foreground">{t("delay") || "Delay"}</Label>
          <Input
            type="number"
            value={formData.entrance.delayValue}
            onChange={(e) => updateNestedFormData("entrance", "delayValue", e.target.value)}
            className="mt-1 w-24 bg-background border-input"
            placeholder="10"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground">{t("duration") || "Duration"}</Label>
          <Input
            type="number"
            value={formData.exit.durationValue}
            onChange={(e) => updateNestedFormData("exit", "durationValue", e.target.value)}
            className="mt-1 w-24 bg-background border-input"
            placeholder="30"
          />
        </div>
      </div>
    </div>
  )
}