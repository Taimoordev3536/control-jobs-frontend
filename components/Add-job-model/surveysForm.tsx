"use client"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { TimePicker } from "@/components/ui/time-picker"
import { useTranslation } from "@/hooks/use-translation"

interface SurveysFormProps {
  formData: any
  updateNestedFormData: (parent: string, field: string, value: any) => void
  enableSurveys: boolean
  setEnableSurveys: (value: boolean) => void
  surveyTab: string
  setSurveyTab: (value: string) => void
}

export function SurveysForm({
  formData,
  updateNestedFormData,
  enableSurveys,
  setEnableSurveys,
  surveyTab,
  setSurveyTab,
}: SurveysFormProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceSurveysNow") || "Introduce surveys now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch checked={enableSurveys} onCheckedChange={setEnableSurveys} />
          <span className="text-sm">{t("si") || "Yes"}</span>
        </div>
      </div>

      {enableSurveys && (
        <div className="space-y-6 mt-8">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList>
              <TabsTrigger value="customer" onClick={() => setSurveyTab("customer")}>
                {t("customerSurvey") || "Customer Survey"}
              </TabsTrigger>
              <TabsTrigger value="worker" onClick={() => setSurveyTab("worker")}>
                {t("workerSurvey") || "Worker Survey"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="customer">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Question Text"}
                  </Label>
                  <Input
                    id="customerQuestionText"
                    value={formData.customerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Monitoring Value"}
                  </Label>
                  <Slider
                    defaultValue={formData.customerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="customerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Text Alert Tracking"}
                  </Label>
                  <Textarea
                    id="customerTextAlertTracking"
                    value={formData.customerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("customerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="customerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Farewell Text"}
                  </Label>
                  <Textarea
                    id="customerFarewellText"
                    value={formData.customerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "farewellText", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      {t("periodicity") || "Periodicity"}
                    </Label>
                    <Select
                      value={formData.customerSurvey.periodicity}
                      onValueChange={(value) => updateNestedFormData("customerSurvey", "periodicity", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("selectPeriodicity") || "Select periodicity"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                        <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customerPeriodicityValue" className="text-sm font-medium text-foreground">
                      {t("periodicityValue") || "Periodicity Value"}
                    </Label>
                    <Input
                      id="customerPeriodicityValue"
                      type="number"
                      value={formData.customerSurvey.periodicityValue}
                      onChange={(e) => updateNestedFormData("customerSurvey", "periodicityValue", e.target.value)}
                      className="mt-1 w-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerHour" className="text-sm font-medium text-foreground">
                      {t("hour") || "Hour"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="customerHour"
                        value={formData.customerSurvey.hour}
                        onChange={(e) => updateNestedFormData("customerSurvey", "hour", e.target.value)}
                        placeholder="08:00"
                        className="w-24"
                      />
                      <TimePicker
                        value={formData.customerSurvey.hour}
                        onChange={(time) => updateNestedFormData("customerSurvey", "hour", time)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="worker">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="workerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Question Text"}
                  </Label>
                  <Input
                    id="workerQuestionText"
                    value={formData.workerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="workerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Monitoring Value"}
                  </Label>
                  <Slider
                    defaultValue={formData.workerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="workerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Text Alert Tracking"}
                  </Label>
                  <Textarea
                    id="workerTextAlertTracking"
                    value={formData.workerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("workerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="workerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Farewell Text"}
                  </Label>
                  <Textarea
                    id="workerFarewellText"
                    value={formData.workerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "farewellText", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium text-foreground">
                      {t("periodicity") || "Periodicity"}
                    </Label>
                    <Select
                      value={formData.workerSurvey.periodicity}
                      onValueChange={(value) => updateNestedFormData("workerSurvey", "periodicity", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("selectPeriodicity") || "Select periodicity"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                        <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="workerPeriodicityValue" className="text-sm font-medium text-foreground">
                      {t("periodicityValue") || "Periodicity Value"}
                    </Label>
                    <Input
                      id="workerPeriodicityValue"
                      type="number"
                      value={formData.workerSurvey.periodicityValue}
                      onChange={(e) => updateNestedFormData("workerSurvey", "periodicityValue", e.target.value)}
                      className="mt-1 w-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="workerHour" className="text-sm font-medium text-foreground">
                      {t("hour") || "Hour"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="workerHour"
                        value={formData.workerSurvey.hour}
                        onChange={(e) => updateNestedFormData("workerSurvey", "hour", e.target.value)}
                        placeholder="08:00"
                        className="w-24"
                      />
                      <TimePicker
                        value={formData.workerSurvey.hour}
                        onChange={(time) => updateNestedFormData("workerSurvey", "hour", time)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
