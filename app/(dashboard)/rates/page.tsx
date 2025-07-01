"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-translation"

export default function RatesPage() {
  const { t } = useTranslation()
  const [rates, setRates] = useState({
    fixedFee: { home: "6", static: "8", remote: "12" },
    workCenters: { home: "5", static: "2", remote: "1" },
    employees: { home: "1", static: "1", remote: "1" },
  })

  const handleInputChange = (category: string, type: string, value: string) => {
    setRates((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [type]: value,
      },
    }))
  }

  const handleKeep = () => {
    console.log("Rates saved:", rates)
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{t("rates")}</h1>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600">
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground"></th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Home</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Static</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Remote</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-background">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{t("fixedFee")}</td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.fixedFee.home}
                    onChange={(e) => handleInputChange("fixedFee", "home", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.fixedFee.static}
                    onChange={(e) => handleInputChange("fixedFee", "static", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.fixedFee.remote}
                    onChange={(e) => handleInputChange("fixedFee", "remote", e.target.value)}
                    className="text-center"
                  />
                </td>
              </tr>
              <tr className="border-b border-border bg-muted/20">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{t("workCenters")}</td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.workCenters.home}
                    onChange={(e) => handleInputChange("workCenters", "home", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.workCenters.static}
                    onChange={(e) => handleInputChange("workCenters", "static", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.workCenters.remote}
                    onChange={(e) => handleInputChange("workCenters", "remote", e.target.value)}
                    className="text-center"
                  />
                </td>
              </tr>
              <tr className="border-b border-border bg-background">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{t("employees")}</td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.employees.home}
                    onChange={(e) => handleInputChange("employees", "home", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.employees.static}
                    onChange={(e) => handleInputChange("employees", "static", e.target.value)}
                    className="text-center"
                  />
                </td>
                <td className="px-6 py-4">
                  <Input
                    type="text"
                    value={rates.employees.remote}
                    onChange={(e) => handleInputChange("employees", "remote", e.target.value)}
                    className="text-center"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{t("vatNotIncluded")}</p>
            <Button onClick={handleKeep} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
              {t("keep")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
