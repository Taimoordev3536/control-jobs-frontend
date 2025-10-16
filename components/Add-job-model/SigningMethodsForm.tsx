"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Smartphone, Laptop, Phone, QrCode, Wifi, MapPin, Globe, PhoneCall } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface SigningMethodsFormProps {
  formData: any
  setFormData: (data: any) => void
  updateFormData: (field: string, value: any) => void
}

export function SigningMethodsForm({ formData, setFormData, updateFormData }: SigningMethodsFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("signingMethods") || "Signing methods"}</h3>

      <div className="space-y-8">
        {/* Mobile Device */}
        <div className="flex items-center justify-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8 justify-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-qr"
                checked={formData.signingMethods.mobile.qrCode}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      mobile: { ...formData.signingMethods.mobile, qrCode: !!checked, wifi: !!formData.signingMethods.mobile.wifi && !checked ? formData.signingMethods.mobile.wifi : formData.signingMethods.mobile.wifi },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <QrCode className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-qr" className="text-sm">
                  QR Code
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-wifi"
                checked={formData.signingMethods.mobile.wifi}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      mobile: { qrCode: false, wifi: !!checked, ip: false, gps: false },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <Wifi className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-wifi" className="text-sm">
                  Wifi
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-gps"
                checked={formData.signingMethods.mobile.gps}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      mobile: { ...formData.signingMethods.mobile, gps: !!checked, wifi: checked ? false : formData.signingMethods.mobile.wifi },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <MapPin className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-gps" className="text-sm">
                  GPS
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Laptop */}
        <div className="flex items-center justify-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Laptop className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8 justify-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="laptop-ip"
                checked={formData.signingMethods.laptop.ip}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      laptop: { ...formData.signingMethods.laptop, ip: !!checked, wifi: checked ? false : formData.signingMethods.laptop.wifi },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="laptop-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="laptop-wifi"
                checked={formData.signingMethods.laptop.wifi}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      laptop: { ip: false, wifi: !!checked },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <Wifi className="w-8 h-8 mb-1" />
                <Label htmlFor="laptop-wifi" className="text-sm">
                  Wifi
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center justify-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Phone className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8 justify-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="phone-caller"
                checked={formData.signingMethods.phone.callerId}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    signingMethods: {
                      ...formData.signingMethods,
                      phone: { callerId: !!checked },
                    },
                  })
                }
              />
              <div className="flex flex-col items-center">
                <PhoneCall className="w-8 h-8 mb-1" />
                <Label htmlFor="phone-caller" className="text-sm">
                  Caller ID
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-medium">{t("verifyIdentity") || "Verify Identity"}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t("no") || "No"}</span>
            <Switch
              checked={formData.verifyIdentity}
              onCheckedChange={(checked) => updateFormData("verifyIdentity", checked)}
            />
            <span className="text-sm">{t("si") || "Yes"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}