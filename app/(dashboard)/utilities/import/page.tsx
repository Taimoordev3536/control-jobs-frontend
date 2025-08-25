

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function ImportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("June 17, 2025")
  const [selectedFile, setSelectedFile] = useState("")
  const { t } = useTranslation()

  const handleImport = () => {
    console.log("Import initiated:", { selectedPeriod, selectedFile })
  }

  const handlePrevPeriod = () => {
    // Handle previous period logic
    console.log("Previous period")
  }

  const handleNextPeriod = () => {
    // Handle next period logic
    console.log("Next period")
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{t("import")}</h1>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Period Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("period")}</Label>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrevPeriod} className="p-1 h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-foreground min-w-[120px] text-center">{selectedPeriod}</span>
              <Button variant="ghost" size="sm" onClick={handleNextPeriod} className="p-1 h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* File Select Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("file")}</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partners">{t("partners")}</SelectItem>
                <SelectItem value="employers">{t("employers")}</SelectItem>
                <SelectItem value="invoices">{t("invoices")}</SelectItem>
                <SelectItem value="commissions">{t("commissions")}</SelectItem>
                <SelectItem value="users">{t("users")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Import Button */}
          <div className="pt-4">
            <Button onClick={handleImport} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
              {t("Import")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
