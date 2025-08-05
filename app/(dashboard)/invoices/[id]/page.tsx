"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Building2, Users, FileText, ChevronDown } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function InvoiceDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const invoiceId = params.id

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto bg-background">
        {/* Header Section */}
        <div className="flex items-start justify-between px-8 py-8 bg-muted/50">
          {/* Left Side - Company Info */}
          <div className="flex-1 max-w-md">
            <h1 className="text-lg font-normal text-muted-foreground mb-8">{t("Bill")}</h1>

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

            <div className="mt-8 space-y-1 text-sm">
              <div className="flex items-center">
                <span className="font-semibold text-foreground">{t("invoiceNo")}:</span>
              </div>
              <div className="flex items-center">
                <span className="font-semibold text-foreground">{t("date")}</span>
              </div>
              <div className="text-muted-foreground mt-2">{t("payments")} by XXXX card</div>
            </div>
          </div>

          {/* Right Side - Bill Info */}
          <div className="flex flex-col items-end">
            <Button variant="outline" size="sm" className="mb-8 px-3 py-1.5 text-xs font-normal bg-transparent">
              <FileText className="h-3 w-3 mr-1" />
              PDF
            </Button>

            <div className="text-right mb-6">
              <h2 className="text-3xl font-normal text-foreground">{t("Bill")}</h2>
            </div>

            <div className="w-80">
              <div className="relative mb-0">
                <select className="w-full px-4 py-3 border border-border bg-background text-foreground text-sm appearance-none pr-10 font-normal rounded-md">
                  <option>ANA LINARES OSÉS</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              <div className="border-t-0">
                <div className="bg-primary text-primary-foreground px-4 py-3 text-sm font-medium">{t("clientData")}</div>
                <div className="border border-t-0 border-border bg-background px-4 py-4 space-y-2 text-sm">
                  <div className="text-muted-foreground italic">Name</div>
                  <div className="text-muted-foreground italic">CIF</div>
                  <div className="text-muted-foreground italic">Address</div>
                  <div className="flex gap-20">
                    <span className="text-muted-foreground italic">CP</span>
                    <span className="text-muted-foreground italic">Locality</span>
                  </div>
                  <div className="flex gap-16">
                    <span className="text-muted-foreground italic">Province</span>
                    <span className="text-muted-foreground italic">Country</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Summary Table */}
        <div className="px-8 py-4">
          <div className="w-full">
            {/* Table Header */}
                <div className="flex mb-4 bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600 pb-2">
                  <div className="w-[60%] pt-2 text-center font-semibold text-foreground">{t("billingSummary")}</div>
                  <div className="w-[13%] pt-2 text-center font-semibold text-foreground">{t("amount")}</div>
                  <div className="w-[13%] pt-2 text-center font-semibold text-foreground">{t("price")}</div>
                  <div className="w-[13%] pt-2 text-center font-semibold text-foreground">{t("total")}</div>
                  <div className="w-[1%]"></div>
                </div>

            {/* Service Rows */}
            <div className="space-y-3 mb-8">
              {/* First Service Row */}
              <div className="flex items-center gap-4">
                <div className="w-[70%]">
                  <div className="bg-muted rounded-lg px-4 py-3 text-foreground font-medium">3 Servicio</div>
                </div>
                <div className="w-[10%] text-center">
                  <input
                    type="number"
                    defaultValue="1"
                    className="w-12 h-8 text-center border border-border bg-background text-foreground text-sm rounded"
                  />
                </div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-blue-600 dark:text-blue-400">4.00</div>
                </div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-foreground">4.00</div>
                </div>
              </div>

              {/* Second Service Row */}
              <div className="flex items-center gap-4">
                <div className="w-[70%]">
                  <div className="bg-muted rounded-lg px-4 py-3 text-foreground font-medium">4 Trabajadores</div>
                </div>
                <div className="w-[10%] text-center">
                  <input
                    type="number"
                    defaultValue="3"
                    className="w-12 h-8 text-center border border-border bg-background text-foreground text-sm rounded"
                  />
                </div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-blue-600 dark:text-blue-400">1.00</div>
                </div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-foreground">3.00</div>
                </div>
              </div>
            </div>

            {/* Partner Discount Section */}
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <div className="w-[70%]"></div>
                <div className="w-[10%] text-right">
                  <span className="font-semibold text-foreground">Partner Dto.</span>
                </div>
                <div className="w-[10%] text-center">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      defaultValue="0"
                      className="w-8 h-8 text-center border border-border bg-background text-foreground text-sm rounded"
                    />
                    <span className="text-foreground text-sm">%</span>
                  </div>
                </div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-foreground">0.00</div>
                </div>
              </div>
            </div>

            {/* Tax Breakdown Section */}
            <div className="space-y-3">
              {/* Tax Breakdown Header */}
                  <div className="flex justify-center mb-4 bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600 pb-2">
                    <span className=" pt-2 font-semibold text-foreground">{t("taxBreakdown")}</span>
                  </div>

              {/* Tax Base Row */}
              <div className="flex items-center gap-4">
                <div className="w-[70%]"></div>
                <div className="w-[10%]"></div>
                <div className="w-[10%] text-center text-foreground">{t("taxBase")}</div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-foreground">7.00</div>
                </div>
              </div>

              {/* VAT Row */}
              <div className="flex items-center gap-4">
                <div className="w-[70%]"></div>
                <div className="w-[10%]"></div>
                <div className="w-[10%] text-center text-foreground">VAT ( 21 %)</div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 text-foreground">1.47</div>
                </div>
              </div>

              {/* Total Row */}
              <div className="flex items-center gap-4">
                <div className="w-[70%]"></div>
                <div className="w-[10%]"></div>
                <div className="w-[10%] text-center font-bold text-foreground">{t("totalToPay")}</div>
                <div className="w-[10%] text-center">
                  <div className="bg-muted/50 rounded px-3 py-2 font-bold text-foreground">7</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="px-8 py-4">
                <div>
                  <div className="flex justify-center mb-4 bg-purple-50 dark:bg-purple-950/50 border-b-2 border-purple-600 pb-2">
                    <span className=" pt-2 font-semibold text-foreground">{t("serviceDetails")}</span>
                  </div>
            <div className="px-8 py-8 bg-card">
              <div className="flex items-start gap-6 mb-8">
                <div className="flex-shrink-0">
                  <Building2 className="h-8 w-8 text-muted-foreground stroke-[1.5]" />
                </div>
                <div>
                  <div className="text-card-foreground font-normal">• {t("center")} 1</div>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-muted-foreground stroke-[1.5]" />
                </div>
                <div className="space-y-2">
                  <div className="text-card-foreground font-normal">• {t("worker")} 1</div>
                  <div className="text-card-foreground font-normal">• {t("worker")} 2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
