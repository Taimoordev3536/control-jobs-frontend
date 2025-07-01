"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function ExportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("June 17, 2025")
  const [selectedFile, setSelectedFile] = useState("")

  const handleExport = () => {
    console.log("Export initiated:", { selectedPeriod, selectedFile })
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
          <h1 className="text-2xl font-semibold text-foreground">Export</h1>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Period Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Period</Label>
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
            <Label className="text-sm font-medium text-foreground">File</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partners">Partners</SelectItem>
                <SelectItem value="employers">Employers</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="commissions">Commissions</SelectItem>
                <SelectItem value="users">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <div className="pt-4">
            <Button onClick={handleExport} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
