



"use client"
import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"

interface EmployerData {
  id: number
  partnerId: number
  name: string
  taxId: string
  address: string
  phone: string
  mobile: string | null
  landline: string
  typeId: number
  subTypeId: number
  fee: string
  discount: string
  paymentMethodId: number
  accountIban: string
  bicSwift: string
  probationPeriod: string
  responsible: string
  accessAccountStatus: string
  createdAt: string
  updatedAt: string
}

interface EmployerDataTabProps {
  employer: any
  getTypeLabel: (typeId: number) => string
  getSubTypeLabel: (subTypeId: number) => string
}

export default function EmployerDataTab({ employer, getTypeLabel, getSubTypeLabel }: EmployerDataTabProps) {
  const { t } = useTranslation()

  // State for editable fields
  const [selectedPartner, setSelectedPartner] = useState(employer.partnerId?.toString() || "")
  const [selectedClass, setSelectedClass] = useState(getSubTypeLabel(employer.subTypeId) || "Particular")
  const [selectedFee, setSelectedFee] = useState(employer.fee || "HOME")
  const [discountValue, setDiscountValue] = useState(employer.discount || "0")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Card")
  const [bicSwiftValue, setBicSwiftValue] = useState(employer.bicSwift || "")

  // State for additional fields not in API
  const [postalCode, setPostalCode] = useState("")
  const [locality, setLocality] = useState("")
  const [province, setProvince] = useState("")
  const [country, setCountry] = useState("")
  const [email, setEmail] = useState("")
  const [observations, setObservations] = useState("")
  const [ccc, setCcc] = useState("")
  const [vatIctServices, setVatIctServices] = useState("0.00")

  // Helper function to extract parts from address
  const parseAddress = (address: string) => {
    if (!address) return { street: "", number: "", floorDoor: "" }
    const parts = address.split(",")
    return {
      street: parts[0]?.trim() || "",
      number: parts[1]?.trim() || "",
      floorDoor: parts[2]?.trim() || "",
    }
  }

  const addressParts = parseAddress(employer.address)

  // Mock data for dropdowns - replace with actual API data
  const partners = [
    { id: "1", name: "Partner 1" },
    { id: "2", name: "Partner 2" },
    { id: "3", name: "Partner 3" },
  ]

  const feeOptions = [
    { value: "HOME", label: "HOME" },
    { value: "OFFICE", label: "OFFICE" },
    { value: "REMOTE", label: "REMOTE" },
    { value: "HYBRID", label: "HYBRID" },
  ]

  const classOptions = [
    { value: "Particular", label: "Particular" },
    { value: "Company", label: "Company" },
    { value: "Individual", label: "Individual" },
    { value: "Freelancer", label: "Freelancer" },
  ]

  const paymentMethods = [
    { value: "Card", label: "Card" },
    { value: "Transfer", label: "Transfer" },
    { value: "PayPal", label: "PayPal" },
    { value: "Cash", label: "Cash" },
  ]

  const handleSave = () => {
    console.log("Saving employer data:", {
      partnerId: selectedPartner,
      class: selectedClass,
      fee: selectedFee,
      discount: discountValue,
      paymentMethod: selectedPaymentMethod,
      bicSwift: bicSwiftValue,
    })
    // Add your save logic here
  }

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* First Row - NIF, CCC, Name, Responsible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">NIF</label>
          <Input value={employer.taxId || ""} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">C.C.C</label>
          <Input value={ccc} onChange={(e) => setCcc(e.target.value)} className="bg-background border-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("name")}</label>
          <Input value={employer.name || ""} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("responsible")}</label>
          <Input value={employer.responsible || ""} className="bg-background border-input" readOnly />
        </div>
      </div>

      {/* Second Row - Address, No., Floor/Door, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("address")}</label>
          <Input value={addressParts.street} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("No")}</label>
          <Input value={addressParts.number} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("floorDoor")}</label>
          <Input value={addressParts.floorDoor} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("PostalCode")}</label>
          <Input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="bg-background border-input"
            placeholder="Enter postal code"
          />
        </div>
      </div>

      {/* Third Row - Locality, Province, Country, % VAT ICT Services */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("locality")}</label>
          <Input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="bg-background border-input"
            placeholder="Enter locality"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("province")}</label>
          <Input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="bg-background border-input"
            placeholder="Enter province"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("country")}</label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-background border-input"
            placeholder="Enter country"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">% VAT ICT Services</label>
          <Input
            value={vatIctServices}
            onChange={(e) => setVatIctServices(e.target.value)}
            className="bg-background border-input"
          />
        </div>
      </div>

      {/* Fourth Row - Phone, Mobile, E-mail + Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("phone")}</label>
          <Input value={employer.landline || ""} className="bg-background border-input" readOnly />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("Mobile")}</label>
          <Input value={employer.phone || ""} className="bg-background border-input" readOnly />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">E-mail</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-input"
              placeholder="Enter email"
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6">{t("users")}</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-6">{t("login")}</Button>
          </div>
        </div>
      </div>

      {/* Bottom Section - Observations and Profile Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("observations")}</label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="bg-background border-input min-h-[120px] resize-none"
          />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-muted flex items-center justify-center mb-4 bg-muted/20">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <Button variant="outline" className="text-sm px-4 bg-transparent">
            Choose file | No file chosen
          </Button>
        </div>
      </div>

      {/* Bottom Billing Section - Working Dropdowns */}
      <div className="border-t border-border pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Partner</label>
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("Fee")}</label>
            <Select value={selectedFee} onValueChange={setSelectedFee}>
              <SelectTrigger className="bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {feeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t("discount")}</label>
            <Input
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="bg-background border-input"
              type="number"
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
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">BIC/SWIFT</label>
            <Input
              value={bicSwiftValue}
              onChange={(e) => setBicSwiftValue(e.target.value)}
              className="bg-background border-input"
              placeholder="Enter BIC/SWIFT code"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
            Keep
          </Button>
          <Button variant="outline" className="px-8 bg-transparent">
            Cancel
          </Button>
          <Button className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 sm:ml-auto">{t("delete")}</Button>
        </div>
      </div>
    </div>
  )
}
