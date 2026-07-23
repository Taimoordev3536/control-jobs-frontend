"use client"

import { useState } from "react"
import { Info, UserSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import FindAvailableWorkersModal from "@/components/add-job-modal/FindAvailableWorkersModal"
import { Input } from "@/components/ui/input"
import DateInput from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "@/hooks/use-translation"
import { FormData, Client, WorkCenter, Worker } from "./types"

interface DefinitionFormProps {
  formData: FormData
  errors: Record<string, string>
  clients: Client[]
  workCenters: WorkCenter[]
  workers: Worker[]
  loadingClients: boolean
  loadingWorkCenters: boolean
  loadingWorkers: boolean
  workCenterQuery: string
  setWorkCenterQuery: (query: string) => void
  workerQuery: string
  setWorkerQuery: (query: string) => void
  workCenterTooltipOpen: boolean
  setWorkCenterTooltipOpen: (open: boolean) => void
  workersTooltipOpen: boolean
  setWorkersTooltipOpen: (open: boolean) => void
  updateFormData: (field: string, value: any) => void
  toggleWorkCenterSelection: (wcId: string) => void
  toggleWorkerSelection: (workerId: string) => void
}

export default function DefinitionForm({
  formData,
  errors,
  clients,
  workCenters,
  workers,
  loadingClients,
  loadingWorkCenters,
  loadingWorkers,
  workCenterQuery,
  setWorkCenterQuery,
  workerQuery,
  setWorkerQuery,
  workCenterTooltipOpen,
  setWorkCenterTooltipOpen,
  workersTooltipOpen,
  setWorkersTooltipOpen,
  updateFormData,
  toggleWorkCenterSelection,
  toggleWorkerSelection,
}: DefinitionFormProps) {
  const { t } = useTranslation()
  const [findOpen, setFindOpen] = useState(false)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("definition") || "Definition"}</h3>

      <div>
        <Label htmlFor="denomination" className="text-sm font-medium text-foreground">
          <span>
            {t("denomination") || "Denomination"}
            <span className="text-destructive ml-1">*</span>
          </span>
        </Label>
        <Input
          id="denomination"
          value={formData.denomination}
          onChange={(e) => updateFormData("denomination", e.target.value)}
          className="mt-1"
          placeholder={t("enterJobName") || "Enter job name"}
        />
        {errors.denomination && <div className="text-sm text-destructive mt-1">{errors.denomination}</div>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-sm font-medium text-foreground flex items-center gap-1">
            <span>
              {t("startDate") || "Start Date"}
              <span className="text-destructive ml-1">*</span>
            </span>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center p-0" aria-label={t("startDate") || "Start date info"} tabIndex={-1}>
                    <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("jobStartDateTip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <div className="relative w-full sm:w-44">
            <DateInput
              id="startDate"
              value={formData.startDate}
              onChange={(e) => updateFormData("startDate", e.target.value)}
              className="mt-1"
            />
            {errors.startDate && <div className="text-sm text-destructive mt-1">{errors.startDate}</div>}
          </div>
        </div>
        <div>
          <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
            {t("endDate") || "End Date"}
          </Label>
          <div className="relative w-full sm:w-44">
            <DateInput
              id="endDate"
              value={formData.endDate}
              onChange={(e) => updateFormData("endDate", e.target.value)}
              className="mt-1"
            />
            {errors.endDate && <div className="text-sm text-destructive mt-1">{errors.endDate}</div>}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="client" className="text-sm font-medium text-foreground flex items-center gap-1">
          <span>
            {t("client") || "Client"}
            <span className="text-destructive ml-1">*</span>
          </span>
        </Label>
        <Select
          value={formData.clientId ? formData.clientId.toString() : ""}
          onValueChange={(value) => {
            updateFormData("clientId", value || null)
            updateFormData("workCenterIds", [])
          }}
          disabled={loadingClients}
        >
          <SelectTrigger className="mt-1 text-foreground">
            <SelectValue placeholder={loadingClients ? t("loadingClients") : t("selectAClient")} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client, index) => (
              <SelectItem
                key={client.id !== null ? client.id : `self-${index}`}
                value={client.id !== null ? client.id.toString() : "self"}
              >
                {client.name} {client.isSelf ? `(${t("mySelf")})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.client && <div className="text-sm text-destructive mt-1">{errors.client}</div>}
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          <span>
            {t("workCenter") || "Work Center"}
            <span className="text-destructive ml-1">*</span>
          </span>
          <TooltipProvider>
            <Tooltip open={workCenterTooltipOpen} onOpenChange={setWorkCenterTooltipOpen} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center p-0"
                  aria-label="Ayuda centro de trabajo"
                  onClick={() => setWorkCenterTooltipOpen(!workCenterTooltipOpen)}
                  tabIndex={-1}
                >
                  <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                {t("selectWorkCentersInfo")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        {errors.workCenters && <div className="text-sm text-destructive mt-1">{errors.workCenters}</div>}

        <div className="mt-1 border rounded-md p-3 min-h-[120px] bg-background">
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {formData.workCenterIds.length > 0 && (
              <div className="mb-2">
                {formData.workCenterIds.map((wcId) => {
                  const wc = workCenters.find((w) =>
                    String(w.id) === String(wcId) ||
                    String((w as any).publicId) === String(wcId)
                  )
                  return wc ? (
                    <div key={wcId} className="text-sm text-foreground">
                      {wc.name}
                    </div>
                  ) : null
                })}
              </div>
            )}

            <div className="border-t pt-2">
              {!formData.clientId ? (
                <div className="text-sm text-muted-foreground">{t("workCenterSelector")}</div>
              ) : loadingWorkCenters ? (
                <div className="text-sm text-muted-foreground">{t("loadingWorkCenters")}</div>
              ) : workCenters && workCenters.length ? (
                <div>
                  <div className="mb-2 ml-3 mr-6">
                    <Input
                      placeholder={t("search") || "Search..."}
                      value={workCenterQuery}
                      onChange={(e) => setWorkCenterQuery(e.target.value)}
                      className="w-full mb-2"
                    />
                    {workCenters
                      .filter((wc) => wc.name.toLowerCase().includes(workCenterQuery.toLowerCase()) || (wc.address || "").toLowerCase().includes(workCenterQuery.toLowerCase()))
                      .map((wc) => (
                        <div key={wc.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`wc-${wc.id}`}
                            checked={formData.workCenterIds.includes(String(wc.id))}
                            onCheckedChange={() => toggleWorkCenterSelection(String(wc.id))}
                          />
                          <Label htmlFor={`wc-${wc.id}`} className="text-sm text-muted-foreground cursor-pointer">
                            {wc.name} {wc.address ? `- ${wc.address}` : ""}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t("noWorkCentersAvailable")}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-1">
            <span>
              {t("workers") || "Workers"}
              <span className="text-destructive ml-1">*</span>
            </span>
            <TooltipProvider>
              <Tooltip open={workersTooltipOpen} onOpenChange={setWorkersTooltipOpen} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center p-0"
                    aria-label="Ayuda trabajadores"
                    onClick={() => setWorkersTooltipOpen(!workersTooltipOpen)}
                    tabIndex={-1}
                  >
                    <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("selectWorkersInfo")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFindOpen(true)}
            title={t("findAvailableWorkers") || "Find available workers"}
            aria-label={t("findAvailableWorkers") || "Find available workers"}
            // Icon-only on narrow screens (label doesn't fit next to "Workers");
            // the full label returns from sm up.
            className="h-8 text-xs text-[#662D91] border-[#662D91]/40 shrink-0 px-2 sm:px-3"
          >
            <UserSearch className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("findAvailableWorkers") || "Find available workers"}</span>
          </Button>
        </div>
        <div className="mt-1 border rounded-md p-3 min-h-[120px] bg-background">
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {formData.workerIds.length > 0 && (
              <div className="mb-2">
                {formData.workerIds.map((workerId) => {
                  const worker = workers.find((w) =>
                    String(w.id) === String(workerId) ||
                    String((w as any).publicId) === String(workerId)
                  )
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
                <div className="text-sm text-muted-foreground">{t("loadingWorkers")}</div>
              ) : (
                <div>
                  <div className="mb-2 ml-3 mr-6">
                    <Input
                      placeholder={t("search") || "Search..."}
                      value={workerQuery}
                      onChange={(e) => setWorkerQuery(e.target.value)}
                      className="w-full mb-2"
                    />
                    {workers
                      .filter((w) =>
                        w.name.toLowerCase().includes(workerQuery.toLowerCase()) ||
                        (w.occupation || "").toLowerCase().includes(workerQuery.toLowerCase()),
                      )
                      .map((worker) => (
                        <div key={worker.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`worker-${worker.id}`}
                            checked={formData.workerIds.includes(worker.id.toString())}
                            onCheckedChange={() => toggleWorkerSelection(worker.id.toString())}
                          />
                          <Label htmlFor={`worker-${worker.id}`} className="text-sm text-muted-foreground cursor-pointer">
                            {worker.name} - {worker.occupation}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {errors.workers && <div className="text-sm text-destructive mt-1">{errors.workers}</div>}
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
          className="mt-1 min-h-[48px]"
          rows={2}
        />
      </div>

      <FindAvailableWorkersModal
        open={findOpen}
        onOpenChange={setFindOpen}
        startDate={formData.startDate}
        endDate={formData.endDate}
        selectedIds={formData.workerIds}
        onToggle={toggleWorkerSelection}
      />
    </div>
  )
}
