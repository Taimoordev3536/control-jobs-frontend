"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"

interface InvoiceLine {
  id: string
  description: string
  amount: number
  price: number
  total: number
}

interface AddInvoicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddInvoicesModal({ open, onOpenChange }: AddInvoicesModalProps) {
  const [selectedEmployer, setSelectedEmployer] = useState("")
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([])
  const [partnerDiscount, setPartnerDiscount] = useState(0)
  const [date, setDate] = useState("")

  const employers = [
    { id: "1", name: "ANA LINARES OSÉS" },
    { id: "2", name: "EMPLOYER 2" },
    { id: "3", name: "EMPLOYER 3" },
  ]

  const addNewLine = () => {
    const newLine: InvoiceLine = {
      id: Date.now().toString(),
      description: "",
      amount: 1,
      price: 0,
      total: 0,
    }
    setInvoiceLines([...invoiceLines, newLine])
  }

  const removeLine = (id: string) => {
    setInvoiceLines(invoiceLines.filter((line) => line.id !== id))
  }

  const updateLine = (id: string, field: keyof InvoiceLine, value: string | number) => {
    setInvoiceLines(
      invoiceLines.map((line) => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value }
          if (field === "amount" || field === "price") {
            updatedLine.total = updatedLine.amount * updatedLine.price
          }
          return updatedLine
        }
        return line
      }),
    )
  }

  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0)
    const discountAmount = subtotal * (partnerDiscount / 100)
    const taxBase = subtotal - discountAmount
    const vatAmount = taxBase * 0.21
    const totalToPay = taxBase + vatAmount

    return {
      subtotal,
      discountAmount,
      taxBase,
      vatAmount,
      totalToPay,
    }
  }

  const totals = calculateTotals()

  const handleKeep = () => {
    // Handle form submission
    console.log("Invoice data:", {
      employer: selectedEmployer,
      date,
      lines: invoiceLines,
      partnerDiscount,
      totals,
    })
    onOpenChange(false)
  }

  const handleCancel = () => {
    // Reset form
    setSelectedEmployer("")
    setInvoiceLines([])
    setPartnerDiscount(0)
    setDate("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader className="sr-only">
          <h2>Add Invoice</h2>
        </DialogHeader>

        <div className="min-h-screen bg-background">
          <div className="max-w-full mx-auto bg-background">
            {/* Header Section */}
            <div className="flex items-start justify-between px-8 py-8 bg-muted/50">
              {/* Left Side - Company Info */}
              <div className="flex-1 max-w-md">
                <h1 className="text-lg font-normal text-muted-foreground mb-8">Bill</h1>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-2xl font-normal text-foreground">Control</span>
                    <span className="text-2xl font-normal text-primary">Jobs</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1 mt-3">
                    <div className="font-normal text-muted-foreground italic">CONTROLJOBS TECH, S.L.U.</div>
                    <div className="italic">B31972524</div>
                    <div className="italic">Calvo Sotelo</div>
                    <div className="flex gap-8 italic">
                      <span>26003</span>
                      <span>Logroño coño</span>
                    </div>
                    <div className="flex gap-8 italic">
                      <span>La Rioja</span>
                      <span>España</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Date:</span>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-40 h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side - Employer Selection */}
              <div className="flex flex-col items-end">
                <div className="w-80">
                  <Select value={selectedEmployer} onValueChange={setSelectedEmployer}>
                    <SelectTrigger className="w-full px-4 py-3 text-sm font-normal">
                      <SelectValue placeholder="Select an employer" />
                    </SelectTrigger>
                    <SelectContent>
                      {employers.map((employer) => (
                        <SelectItem key={employer.id} value={employer.id}>
                          {employer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="border-t-0 mt-0">
                    <div className="bg-muted px-4 py-3 space-y-2 text-sm">
                      <div className="text-muted-foreground italic">Name</div>
                      <div className="text-muted-foreground italic">NIF</div>
                      <div className="text-muted-foreground italic">Address</div>
                      <div className="flex gap-20">
                        <span className="text-muted-foreground italic">CP</span>
                        <span className="text-muted-foreground italic">Locality</span>
                      </div>
                      <div className="text-muted-foreground italic">Province</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* New Line Button */}
            <div className="px-8 py-4 flex justify-end">
              <Button onClick={addNewLine} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New line
              </Button>
            </div>

            {/* Billing Summary Table */}
            <div className="px-8 py-4">
              <div className="w-full">
                {/* Table Header */}
                <div className="flex mb-4 border-b-2 border-primary pb-2">
                  <div className="w-[60%] text-center font-semibold text-foreground">Billing Summary</div>
                  <div className="w-[13%] text-center font-semibold text-foreground">Amount</div>
                  <div className="w-[13%] text-center font-semibold text-foreground">Price</div>
                  <div className="w-[13%] text-center font-semibold text-foreground">Total</div>
                  <div className="w-[1%]"></div>
                </div>

                {/* Service Rows */}
                <div className="space-y-3 mb-8">
                  {invoiceLines.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">There are no lines on the invoice</div>
                  ) : (
                    invoiceLines.map((line) => (
                      <div key={line.id} className="flex items-center gap-4">
                        <div className="w-[60%]">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                            placeholder="Service description"
                            className="bg-muted rounded-lg px-4 py-3 font-medium"
                          />
                        </div>
                        <div className="w-[13%] text-center">
                          <Input
                            type="number"
                            value={line.amount}
                            onChange={(e) => updateLine(line.id, "amount", Number.parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-center text-sm"
                            min="0"
                            step="1"
                          />
                        </div>
                        <div className="w-[13%] text-center">
                          <Input
                            type="number"
                            value={line.price}
                            onChange={(e) => updateLine(line.id, "price", Number.parseFloat(e.target.value) || 0)}
                            className="w-full h-8 text-center text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="w-[13%] text-center">
                          <div className="bg-muted/50 rounded px-3 py-2 text-foreground">{line.total.toFixed(2)}</div>
                        </div>
                        <div className="w-[1%]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Partner Discount Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-[60%]"></div>
                    <div className="w-[13%] text-right">
                      <span className="font-semibold text-foreground">Partner Dto.</span>
                    </div>
                    <div className="w-[13%] text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          value={partnerDiscount}
                          onChange={(e) => setPartnerDiscount(Number.parseFloat(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-sm"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <span className="text-foreground text-sm">%</span>
                      </div>
                    </div>
                    <div className="w-[13%] text-center">
                      <div className="bg-muted/50 rounded px-3 py-2 text-foreground">
                        {totals.discountAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-[1%]"></div>
                  </div>
                </div>

                {/* Tax Breakdown Section */}
                <div className="space-y-3">
                  {/* Tax Breakdown Header */}
                  <div className="flex justify-center items-center border-b-2 border-primary pb-2">
                    <span className="font-semibold text-foreground">Tax breakdown</span>
                  </div>

                  {/* Tax Base Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-[60%]"></div>
                    <div className="w-[13%]"></div>
                    <div className="w-[13%] text-center text-foreground">Tax base</div>
                    <div className="w-[13%] text-center">
                      <div className="bg-muted/50 rounded px-3 py-2 text-foreground">{totals.taxBase.toFixed(2)}</div>
                    </div>
                    <div className="w-[1%]"></div>
                  </div>

                  {/* VAT Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-[60%]"></div>
                    <div className="w-[13%]"></div>
                    <div className="w-[13%] text-center text-foreground">VAT ( 21 %)</div>
                    <div className="w-[13%] text-center">
                      <div className="bg-muted/50 rounded px-3 py-2 text-foreground">{totals.vatAmount.toFixed(2)}</div>
                    </div>
                    <div className="w-[1%]"></div>
                  </div>

                  {/* Total Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-[60%]"></div>
                    <div className="w-[13%]"></div>
                    <div className="w-[13%] text-center font-bold text-foreground">TOTAL TO PAY</div>
                    <div className="w-[13%] text-center">
                      <div className="bg-muted/50 rounded px-3 py-2 font-bold text-foreground">
                        {totals.totalToPay.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-[1%]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-8 py-6 flex gap-4">
              <Button onClick={handleKeep} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Keep
              </Button>
              <Button onClick={handleCancel} variant="secondary">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
