"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "@/hooks/use-translation"

interface DefinitionDetailsProps {
  jobData: any
  clients: any[]
  workCenters: any[]
  workers: any[]
  isEditable: boolean
  onUpdate: (field: string, value: any) => void
}

export function DefinitionDetails({ jobData, clients, workCenters, workers, isEditable, onUpdate }: DefinitionDetailsProps) {
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
          value={jobData?.jobName || ""}
          onChange={(e) => isEditable && onUpdate("jobName", e.target.value)}
          disabled={!isEditable}
          className="mt-1"
          placeholder="Job name"
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
            value={jobData?.startDate || ""}
            onChange={(e) => isEditable && onUpdate("startDate", e.target.value)}
            disabled={!isEditable}
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
            value={jobData?.endDate || ""}
            onChange={(e) => isEditable && onUpdate("endDate", e.target.value)}
            disabled={!isEditable}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="client" className="text-sm font-medium text-foreground">
          {t("client") || "Client"}
        </Label>
        <Select
          value={jobData?.clientId?.toString() || ""}
          onValueChange={(value) => isEditable && onUpdate("clientId", Number.parseInt(value))}
          disabled={!isEditable}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select a client" />
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
        <Label htmlFor="observations" className="text-sm font-medium text-foreground">
          {t("observations") || "Observations"}
        </Label>
        <Textarea
          id="observations"
          value={jobData?.note || ""}
          onChange={(e) => isEditable && onUpdate("note", e.target.value)}
          disabled={!isEditable}
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  )
}
