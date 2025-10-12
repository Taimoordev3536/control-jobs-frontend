"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Info } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface Client {
  id: number
  name: string
  locality: string
  type: string
  responsible: string
  telephones: string
  asset: string
}

interface WorkCenter {
  id: number
  name: string
  address: string
  contactName: string
  contactPhone: string
  contactEmail: string
  clientId: number
  createdAt: string
  updatedAt: string
}

interface Worker {
  id: number
  name: string
  occupation: string
  telephones: string
  address: string
  asset: string
}

interface DefinitionFormProps {
  formData: any
  updateFormData: (field: string, value: any) => void
  clients: Client[]
  workCenters: WorkCenter[]
  workers: Worker[]
  loadingClients: boolean
  loadingWorkCenters: boolean
  loadingWorkers: boolean
  toggleWorkerSelection: (workerId: string) => void
  toggleWorkCenterSelection?: (wcId: string) => void
}

export function DefinitionForm({
  formData,
  updateFormData,
  clients,
  workCenters,
  workers,
  loadingClients,
  loadingWorkCenters,
  loadingWorkers,
  toggleWorkerSelection,
}: DefinitionFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("definition") || "Definition"}</h3>

      <div>
        <Label htmlFor="denomination" className="text-sm font-medium text-foreground">
          {t("denomination") || "Denomination"}
        </Label>
        <Input
          id="denomination"
          value={formData.denomination}
          onChange={(e) => updateFormData("denomination", e.target.value)}
          className="mt-1"
          placeholder="Enter job name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
            {t("startDate") || "Start Date"}
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => updateFormData("startDate", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
            {t("endDate") || "End Date"}
          </Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => updateFormData("endDate", e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="client" className="text-sm font-medium text-foreground">
          {t("client") || "Client"}
        </Label>
        <Select
          value={formData.clientId}
          onValueChange={(value) => {
            updateFormData("clientId", value)
            updateFormData("workCenterIds", [])
          }}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="workCenter" className="text-sm font-medium text-foreground">
          {t("workCenter") || "Work Center"}
        </Label>
        {/* Multi-select work centers via checkboxes. Keep a fallback single select for compact UI. */}
        <div className="mt-1 border rounded-md p-3 bg-background">
          {formData.workCenterIds && formData.workCenterIds.length > 0 && (
            <div className="mb-2">
              {formData.workCenterIds.map((id: string) => {
                const wc = workCenters.find((w) => w.id.toString() === id)
                return wc ? (
                  <div key={id} className="text-sm text-foreground">
                    {wc.name}
                  </div>
                ) : null
              })}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto">
            {loadingWorkCenters ? (
              <div className="text-sm text-muted-foreground">Loading work centers...</div>
            ) : (
              workCenters.map((center) => (
                <div key={center.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`workcenter-${center.id}`}
                    checked={formData.workCenterIds.includes(String(center.id))}
                    onCheckedChange={() => (toggleWorkCenterSelection ? toggleWorkCenterSelection(String(center.id)) : updateFormData("workCenterIds", [String(center.id)]))}
                  />
                  <Label htmlFor={`workcenter-${center.id}`} className="text-sm cursor-pointer">
                    {center.name} - {center.address}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          {t("workers") || "Workers"}
          <Info className="w-4 h-4 text-muted-foreground" />
        </Label>
        <div className="mt-1 border rounded-md p-3 min-h-[120px] bg-background">
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {formData.workerIds.length > 0 && (
              <div className="mb-2">
                {formData.workerIds.map((workerId: string) => {
                  const worker = workers.find((w) => w.id.toString() === workerId)
                  return worker ? (
                    <div key={workerId} className="text-sm text-foreground">
                      {worker.name}
                    </div>
                  ) : null
                })}
              </div>
            )}
            <div className="border-t pt-2">
              {loadingWorkers ? (
                <div className="text-sm text-muted-foreground">Loading workers...</div>
              ) : (
                workers.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`worker-${worker.id}`}
                      checked={formData.workerIds.includes(worker.id.toString())}
                      onCheckedChange={() => toggleWorkerSelection(worker.id.toString())}
                    />
                    <Label htmlFor={`worker-${worker.id}`} className="text-sm cursor-pointer">
                      {worker.name} - {worker.occupation}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="observations" className="text-sm font-medium text-foreground">
          {t("observations") || "Observations"}
        </Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => updateFormData("observations", e.target.value)}
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  )
}
