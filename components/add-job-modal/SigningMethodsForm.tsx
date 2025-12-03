"use client"

import { Smartphone, Wifi, MapPin, Globe, QrCode, Info, LockKeyholeOpen, Laptop } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useTranslation } from "@/hooks/use-translation"
import { FormData } from "./types"

interface SigningMethodsFormProps {
  formData: FormData
  errors: Record<string, string>
  updateFormData: (field: string, value: any) => void
  updateSigningMethod: (device: 'mobile' | 'laptop' | 'phone', method: string, checked: boolean) => void
}

export default function SigningMethodsForm({
  formData,
  errors,
  updateFormData,
  updateSigningMethod,
}: SigningMethodsFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-6 underline">
        {t("signingMethods") || "Signing methods"}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info tabIndex={-1} className="inline-flex items-center p-0 w-3 h-3 text-muted-foreground cursor-help ml-1" />
            </TooltipTrigger>
            <TooltipContent side="right" align="start" sideOffset={6} className="max-w-[12.6rem] text-left whitespace-pre-line">
              {t("signingMethodTitleTips")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </h3>

      <div className="ml-8">
        {/* Mobile Device */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Smartphone className="w-16 h-16 text-foreground" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("signingMethodTipsMobile")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ml-6 flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-web"
                checked={formData.signingMethods.mobile.wifi}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'wifi', !!checked)}
              />
              <div className="flex flex-col items-center">
                <LockKeyholeOpen className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-web" className="text-sm">
                  Web
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-ip"
                checked={formData.signingMethods.mobile.ip}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'ip', !!checked)}
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-gps"
                checked={formData.signingMethods.mobile.gps}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'gps', !!checked)}
              />
              <div className="flex flex-col items-center">
                <MapPin className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-gps" className="text-sm">
                  GPS
                </Label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-qr"
                checked={formData.signingMethods.mobile.qrCode}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'qrCode', !!checked)}
              />
              <div className="flex flex-col items-center">
                <QrCode className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-qr" className="text-sm">
                  QR Code
                </Label>
              </div>
            </div>
          </div>
        </div>
        <br />
        {/* Desktop Device */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Laptop className="w-16 h-16 text-foreground" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info tabIndex={-1} className=" w-3 h-3 text-muted-foreground cursor-help ml-1" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("signingMethodTipsDesktop")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ml-6 flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desktop-web"
                checked={formData.signingMethods.laptop?.wifi}
                onCheckedChange={(checked) => updateSigningMethod('laptop', 'wifi', !!checked)}
              />
              <div className="flex flex-col items-center">
                <LockKeyholeOpen className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-web" className="text-sm">
                  Web
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="desktop-ip"
                checked={formData.signingMethods.laptop?.ip}
                onCheckedChange={(checked) => updateSigningMethod('laptop', 'ip', !!checked)}
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="flex items-center justify-center">
          <span className="text-sm p-1 font-medium">{t("verifyIdentity") || "Verify Identity"}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info tabIndex={-1} className="inline-flex items-center p-0 w-3 h-3 text-muted-foreground cursor-help ml-1" />
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                {t("signingMethodIdentityTips")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center pl-2">
            <span className=" text-sm">{t("no") || "No"}</span>
            <Switch
              className=" scale-[0.65]"
              checked={formData.verifyIdentity}
              onCheckedChange={(checked) => updateFormData("verifyIdentity", checked)}
            />
            <span className="text-sm">{t("si") || "Yes"}</span>
          </div>
        </div>
      </div>
      {errors.signingMethods && (
        <p className="mt-2 text-sm text-red-500 text-center">{errors.signingMethods}</p>
      )}
    </div>
  )
}
