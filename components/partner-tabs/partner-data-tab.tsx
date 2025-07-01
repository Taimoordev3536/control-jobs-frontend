


"use client"

import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"

interface PartnerDataTabProps {
  partnerData: {
    nif: string
    name: string
    responsible: string
    address: string
    no: string
    floorDoor: string
    postalCode: string
    locality: string
    province: string
    country: string
    vatIct: string
    phone: string
    mobile: string
    email: string
    observations: string
    type: string
    commission: string
    retention: string
    paymentMethod: string
    accountIban: string
    bicSwift: string
  }
}

export default function PartnerDataTab({ partnerData }: PartnerDataTabProps) {
  const { t } = useTranslation()

  // State for editable fields
  const [selectedType, setSelectedType] = useState(partnerData.type || "Basic")
  const [commissionValue, setCommissionValue] = useState(partnerData.commission || "30")
  const [retentionValue, setRetentionValue] = useState(partnerData.retention || "20")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(partnerData.paymentMethod || "Transfer")
  const [accountIbanValue, setAccountIbanValue] = useState(partnerData.accountIban || "ES1112340512331331233123")
  const [bicSwiftValue, setBicSwiftValue] = useState(partnerData.bicSwift || "BDDE")

  // Options for dropdowns
  const typeOptions = ["Basic","Premium","Gold","bronze" ,"affiliate"]
  const paymentMethods = ["Transfer", "Card", "PayPal", "Others"]

  const handleSave = () => {
    const updatedData = {
      ...partnerData,
      type: selectedType,
      commission: commissionValue,
      retention: retentionValue,
      paymentMethod: selectedPaymentMethod,
      accountIban: accountIbanValue,
      bicSwift: bicSwiftValue,
    }
    console.log("Saving partner data:", updatedData)
    // Here you would typically make an API call to save the data
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* First Row - NIF, Name, Responsible */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("nif")}</label>
          <Input value={partnerData.nif || "B31790579"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("name")}</label>
          <Input value={partnerData.name || "OCU"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("responsible")}</label>
          <Input value={partnerData.responsible || "Fernando Gil"} className="bg-background border-input" readOnly />
        </div>
      </div>

      {/* Second Row - Address, No., Floor/Door, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">{t("address")}</label>
          <Input
            value={partnerData.address || "Paseo de la Castellana"}
            className="bg-background border-input"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("number")}</label>
          <Input value={partnerData.no || ""} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("floorDoor")}</label>
          <Input value={partnerData.floorDoor || ""} className="bg-background border-input" readOnly />
        </div>
      </div>

      {/* Third Row - Locality, Province, Country, % VAT ICT Services */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("locality")}</label>
          <Input value={partnerData.locality || "Madrid"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("province")}</label>
          <Input value={partnerData.province || "Madrid"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("country")}</label>
          <Input value={partnerData.country || "España"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("vatIctServices")}</label>
          <Input value={partnerData.vatIct || "21.00"} className="bg-background border-input" readOnly />
        </div>
      </div>

      {/* Fourth Row - Phone, Mobile, E-mail, Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("phone")}</label>
          <Input value={partnerData.phone || "913888666"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("mobile")}</label>
          <Input value={partnerData.mobile || "632909090"} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("email")}</label>
          <Input value={partnerData.email || "ocu@socialis.com"} className="bg-background border-input" readOnly />
        </div>
        <div className="flex gap-2">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">{t("users")}</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white px-6">{t("login")}</Button>
        </div>
      </div>

      {/* Bottom Section - Observations and Profile Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("observations")}</label>
          <Textarea
            value={partnerData.observations || "Organización de Consumidores de Usuarios"}
            className="bg-background border-input min-h-[120px] resize-none"
            readOnly
          />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-muted flex items-center justify-center mb-4 bg-muted/20">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <Button variant="outline" className="text-sm px-4 bg-transparent">
            {t("chooseFile")}
          </Button>
        </div>
      </div>

      {/* Bottom Billing Section */}
      <div className="border-t border-border pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("type")}</label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(option.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("commission")}</label>
            <Input
              type="number"
              value={commissionValue}
              onChange={(e) => setCommissionValue(e.target.value)}
              className="bg-background border-input"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("retention")}</label>
            <Input
              type="number"
              value={retentionValue}
              onChange={(e) => setRetentionValue(e.target.value)}
              className="bg-background border-input"
              min="0"
              max="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("paymentMethod")}</label>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {t(method.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("accountIban")}</label>
            <Input
              value={accountIbanValue}
              onChange={(e) => setAccountIbanValue(e.target.value)}
              className="bg-background border-input"
              placeholder="Enter IBAN"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("bicSwift")}</label>
            <Input
              value={bicSwiftValue}
              onChange={(e) => setBicSwiftValue(e.target.value)}
              className="bg-background border-input"
              placeholder="Enter BIC/SWIFT"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
            {t("keep")}
          </Button>
          <Button variant="outline" className="px-8 bg-transparent">
            {t("cancel")}
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 sm:ml-auto">{t("delete")}</Button>
        </div>
      </div>
    </div>
  )
}



