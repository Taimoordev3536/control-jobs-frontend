"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimePicker } from "@/components/ui/time-picker"
import { useTranslation } from "@/hooks/use-translation"
import { FormData } from "./types"

interface SurveysFormProps {
  enableSurveys: boolean
  setEnableSurveys: (enabled: boolean) => void
  formData: FormData
  updateNestedFormData: (parent: string, field: string, value: any) => void
}

export default function SurveysForm({
  enableSurveys,
  setEnableSurveys,
  formData,
  updateNestedFormData,
}: SurveysFormProps) {
  const { t } = useTranslation()
  const [surveyTab, setSurveyTab] = useState("customer")

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceSurveysNow") || "Introduce surveys now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch className="scale-[0.65]" checked={enableSurveys} onCheckedChange={setEnableSurveys} />
          <span className="text-sm">{t("si") || "Yeah"}</span>
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

            {/* Customer Survey Tab */}
            <TabsContent value="customer">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Texto de la pregunta"}
                  </Label>
                  <Input
                    id="customerQuestionText"
                    value={formData.customerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                    placeholder={t("questionTextPlaceHolder") || "Texto de la pregunta"}
                  />
                </div>

                <div>
                  <Label htmlFor="customerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Límite de alerta"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>{t("surveyMonitoringValueTips")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Slider
                    defaultValue={formData.customerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="w-6 text-center">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Mensaje de alerta"}
                  </Label>
                  <Textarea
                    id="customerTextAlertTracking"
                    value={formData.customerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("customerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("textAlertTrackingPlaceHolder") || "Indícanos en qué debemos mejorar"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label htmlFor="customerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Mensaje de despedida"}
                  </Label>
                  <Textarea
                    id="customerFarewellText"
                    value={formData.customerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "farewellText", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("farewellTextPlaceHolder") || "Gracias por tu colaboración"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground">
                    {t("periodicity") || "Periodicidad"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>{t("surveyPriodicityTips")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select
                    value={formData.customerSurvey.periodicity}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "periodicity", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("selectPeriodicity") || "Seleccione periodicidad"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("daily") || "Diaria"}</SelectItem>
                      <SelectItem value="weekly">{t("weekly") || "Semanal"}</SelectItem>
                      <SelectItem value="monthly">{t("monthly") || "Mensual"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="grid grid-cols-1 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("interval") || "Intervalo"}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("every") || "Cada"}</span>
                          <Input
                            type="number"
                            value={formData.customerSurvey.interval}
                            onChange={(e) =>
                              updateNestedFormData("customerSurvey", "interval", Number(e.target.value))
                            }
                            className="w-16 text-center"
                            min="1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {formData.customerSurvey.periodicity === "daily"
                              ? formData.customerSurvey.interval === 1
                                ? t("day") || "Día"
                                : t("days") || "Días"
                              : formData.customerSurvey.periodicity === "weekly"
                                ? formData.customerSurvey.interval === 1
                                  ? t("week") || "Semana"
                                  : t("weeks") || "Semanas"
                                : formData.customerSurvey.interval === 1
                                  ? t("month") || "Mes"
                                  : t("months") || "Meses"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {formData.customerSurvey.periodicity === "weekly" && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">{t("selectDays") || "Seleccionar Días"}</Label>
                        <div className="flex gap-2">
                          {[
                            { key: 1, label: t("dayM"), full: t("monday") },
                            { key: 2, label: t("dayT"), full: t("tuesday") },
                            { key: 3, label: t("dayW"), full: t("wednesday") },
                            { key: 4, label: t("dayTh"), full: t("thursday") },
                            { key: 5, label: t("dayF"), full: t("friday") },
                            { key: 6, label: t("daySa"), full: t("saturday") },
                            { key: 0, label: t("daySu"), full: t("sunday") },
                          ].map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-medium rounded border transition-all
                                ${
                                  formData.customerSurvey.weeklyDays?.includes(day.key)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }
                              `}
                              onClick={() => {
                                const currentDays = formData.customerSurvey.weeklyDays || []
                                if (currentDays.includes(day.key)) {
                                  updateNestedFormData(
                                    "customerSurvey",
                                    "weeklyDays",
                                    currentDays.filter((d) => d !== day.key)
                                  )
                                } else {
                                  updateNestedFormData("customerSurvey", "weeklyDays", [...currentDays, day.key])
                                }
                              }}
                              title={day.full}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.customerSurvey.periodicity === "monthly" && (
                      <div className="mt-4 space-y-4">
                        <Label className="text-sm font-medium mb-2 block">{t("scheduleBy") || "Programar"}</Label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.customerSurvey.monthlyMode === "dates"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "dates")}
                          >
                            {t("dates") || "Días concretos"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.customerSurvey.monthlyMode === "weekdays"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "weekdays")}
                          >
                            {t("weekdays") || "Días de la Semana"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.customerSurvey.monthlyMode === "firstWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "firstWeekDay")}
                          >
                            {t("firstWeekDay") || "El primero del mes"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.customerSurvey.monthlyMode === "lastWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "lastWeekDay")}
                          >
                            {t("lastWeekDay") || "El último del mes"}
                          </button>
                        </div>

                        {formData.customerSurvey.monthlyMode === "dates" && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <button
                                key={date}
                                type="button"
                                className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all ${
                                  formData.customerSurvey.monthlyDays?.includes(date)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }`}
                                onClick={() => {
                                  const current = formData.customerSurvey.monthlyDays || []
                                  if (current.includes(date)) {
                                    updateNestedFormData(
                                      "customerSurvey",
                                      "monthlyDays",
                                      current.filter((d) => d !== date)
                                    )
                                  } else {
                                    updateNestedFormData("customerSurvey", "monthlyDays", [...current, date])
                                  }
                                }}
                              >
                                {date}
                              </button>
                            ))}
                          </div>
                        )}

                        {(formData.customerSurvey.monthlyMode === "weekdays" ||
                          formData.customerSurvey.monthlyMode === "firstWeekDay" ||
                          formData.customerSurvey.monthlyMode === "lastWeekDay") && (
                          <div className="flex flex-wrap gap-3">
                            {[
                              { key: "monday", label: t("monday"), value: 1 },
                              { key: "tuesday", label: t("tuesday"), value: 2 },
                              { key: "wednesday", label: t("wednesday"), value: 3 },
                              { key: "thursday", label: t("thursday"), value: 4 },
                              { key: "friday", label: t("friday"), value: 5 },
                              { key: "saturday", label: t("saturday"), value: 6 },
                              { key: "sunday", label: t("sunday"), value: 0 },
                            ].map((day) => (
                              <div key={day.key} className="flex items-center space-x-2">
                                {formData.customerSurvey.monthlyMode === "weekdays" ? (
                                  <>
                                    <Checkbox
                                      id={`customer-monthly-${day.key}`}
                                      checked={formData.customerSurvey.monthlyWeekdays?.includes(day.value) || false}
                                      onCheckedChange={(checked) => {
                                        const current = formData.customerSurvey.monthlyWeekdays || []
                                        if (checked) {
                                          updateNestedFormData("customerSurvey", "monthlyWeekdays", [...current, day.value])
                                        } else {
                                          updateNestedFormData(
                                            "customerSurvey",
                                            "monthlyWeekdays",
                                            current.filter((d) => d !== day.value)
                                          )
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`customer-monthly-${day.key}`} className="text-sm cursor-pointer">
                                      {day.label}
                                    </Label>
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="radio"
                                      name={`customer-monthly-${formData.customerSurvey.monthlyMode}`}
                                      id={`customer-monthly-${day.key}-radio`}
                                      checked={
                                        formData.customerSurvey.monthlyMode === "firstWeekDay"
                                          ? formData.customerSurvey.monthlyFirstWeekday === day.value
                                          : formData.customerSurvey.monthlyLastWeekday === day.value
                                      }
                                      onChange={() => {
                                        if (formData.customerSurvey.monthlyMode === "firstWeekDay") {
                                          updateNestedFormData("customerSurvey", "monthlyFirstWeekday", day.value)
                                          updateNestedFormData("customerSurvey", "monthlyLastWeekday", null)
                                        } else {
                                          updateNestedFormData("customerSurvey", "monthlyLastWeekday", day.value)
                                          updateNestedFormData("customerSurvey", "monthlyFirstWeekday", null)
                                        }
                                      }}
                                      className="form-radio text-primary"
                                    />
                                    <Label
                                      htmlFor={`customer-monthly-${day.key}-radio`}
                                      className="text-sm cursor-pointer ml-2"
                                    >
                                      {day.label}
                                    </Label>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Worker Survey Tab */}
            <TabsContent value="worker">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="workerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Texto de la pregunta"}
                  </Label>
                  <Input
                    id="workerQuestionText"
                    value={formData.workerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                    placeholder={t("questionTextPlaceHolder") || "Texto de la pregunta"}
                  />
                </div>

                <div>
                  <Label htmlFor="workerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Límite de alerta"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>{t("surveyMonitoringValueTips")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Slider
                    defaultValue={formData.workerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="w-6 text-center">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="workerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Mensaje de alerta"}
                  </Label>
                  <Textarea
                    id="workerTextAlertTracking"
                    value={formData.workerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("workerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("textAlertTrackingPlaceHolder") || "Indícanos en qué debemos mejorar"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label htmlFor="workerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Mensaje de despedida"}
                  </Label>
                  <Textarea
                    id="workerFarewellText"
                    value={formData.workerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "farewellText", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("farewellTextPlaceHolder") || "Gracias por tu colaboración"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground">
                    {t("periodicity") || "Periodicidad"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>{t("surveyPriodicityTips")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select
                    value={formData.workerSurvey.periodicity}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "periodicity", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("selectPeriodicity") || "Seleccione periodicidad"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("daily") || "Diaria"}</SelectItem>
                      <SelectItem value="weekly">{t("weekly") || "Semanal"}</SelectItem>
                      <SelectItem value="monthly">{t("monthly") || "Mensual"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="grid grid-cols-1 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("interval") || "Intervalo"}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("every") || "Cada"}</span>
                          <Input
                            type="number"
                            value={formData.workerSurvey.interval}
                            onChange={(e) => updateNestedFormData("workerSurvey", "interval", Number(e.target.value))}
                            className="w-16 text-center"
                            min="1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {formData.workerSurvey.periodicity === "daily"
                              ? formData.workerSurvey.interval === 1
                                ? t("day") || "Día"
                                : t("days") || "Días"
                              : formData.workerSurvey.periodicity === "weekly"
                                ? formData.workerSurvey.interval === 1
                                  ? t("week") || "Semana"
                                  : t("weeks") || "Semanas"
                                : formData.workerSurvey.interval === 1
                                  ? t("month") || "Mes"
                                  : t("months") || "Meses"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {formData.workerSurvey.periodicity === "weekly" && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">{t("selectDays") || "Seleccionar Días"}</Label>
                        <div className="flex gap-2">
                          {[
                            { key: 1, label: t("dayM"), full: t("monday") },
                            { key: 2, label: t("dayT"), full: t("tuesday") },
                            { key: 3, label: t("dayW"), full: t("wednesday") },
                            { key: 4, label: t("dayTh"), full: t("thursday") },
                            { key: 5, label: t("dayF"), full: t("friday") },
                            { key: 6, label: t("daySa"), full: t("saturday") },
                            { key: 0, label: t("daySu"), full: t("sunday") },
                          ].map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-medium rounded border transition-all
                                ${
                                  formData.workerSurvey.weeklyDays?.includes(day.key)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }
                              `}
                              onClick={() => {
                                const currentDays = formData.workerSurvey.weeklyDays || []
                                if (currentDays.includes(day.key)) {
                                  updateNestedFormData(
                                    "workerSurvey",
                                    "weeklyDays",
                                    currentDays.filter((d) => d !== day.key)
                                  )
                                } else {
                                  updateNestedFormData("workerSurvey", "weeklyDays", [...currentDays, day.key])
                                }
                              }}
                              title={day.full}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.workerSurvey.periodicity === "monthly" && (
                      <div className="mt-4 space-y-4">
                        <Label className="text-sm font-medium mb-2 block">{t("scheduleBy") || "Programar"}</Label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.workerSurvey.monthlyMode === "dates"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "dates")}
                          >
                            {t("dates") || "Días concretos"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.workerSurvey.monthlyMode === "weekdays"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "weekdays")}
                          >
                            {t("weekdays") || "Días de la Semana"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.workerSurvey.monthlyMode === "firstWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "firstWeekDay")}
                          >
                            {t("firstWeekDay") || "El primero del mes"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${
                              formData.workerSurvey.monthlyMode === "lastWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "lastWeekDay")}
                          >
                            {t("lastWeekDay") || "El último del mes"}
                          </button>
                        </div>

                        {formData.workerSurvey.monthlyMode === "dates" && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <button
                                key={date}
                                type="button"
                                className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all ${
                                  formData.workerSurvey.monthlyDays?.includes(date)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }`}
                                onClick={() => {
                                  const current = formData.workerSurvey.monthlyDays || []
                                  if (current.includes(date)) {
                                    updateNestedFormData(
                                      "workerSurvey",
                                      "monthlyDays",
                                      current.filter((d) => d !== date)
                                    )
                                  } else {
                                    updateNestedFormData("workerSurvey", "monthlyDays", [...current, date])
                                  }
                                }}
                              >
                                {date}
                              </button>
                            ))}
                          </div>
                        )}

                        {(formData.workerSurvey.monthlyMode === "weekdays" ||
                          formData.workerSurvey.monthlyMode === "firstWeekDay" ||
                          formData.workerSurvey.monthlyMode === "lastWeekDay") && (
                          <div className="flex flex-wrap gap-3">
                            {[
                              { key: "monday", label: t("monday"), value: 1 },
                              { key: "tuesday", label: t("tuesday"), value: 2 },
                              { key: "wednesday", label: t("wednesday"), value: 3 },
                              { key: "thursday", label: t("thursday"), value: 4 },
                              { key: "friday", label: t("friday"), value: 5 },
                              { key: "saturday", label: t("saturday"), value: 6 },
                              { key: "sunday", label: t("sunday"), value: 0 },
                            ].map((day) => (
                              <div key={day.key} className="flex items-center space-x-2">
                                {formData.workerSurvey.monthlyMode === "weekdays" ? (
                                  <>
                                    <Checkbox
                                      id={`worker-monthly-${day.key}`}
                                      checked={formData.workerSurvey.monthlyWeekdays?.includes(day.value) || false}
                                      onCheckedChange={(checked) => {
                                        const current = formData.workerSurvey.monthlyWeekdays || []
                                        if (checked) {
                                          updateNestedFormData("workerSurvey", "monthlyWeekdays", [...current, day.value])
                                        } else {
                                          updateNestedFormData(
                                            "workerSurvey",
                                            "monthlyWeekdays",
                                            current.filter((d) => d !== day.value)
                                          )
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`worker-monthly-${day.key}`} className="text-sm cursor-pointer">
                                      {day.label}
                                    </Label>
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="radio"
                                      name={`worker-monthly-${formData.workerSurvey.monthlyMode}`}
                                      id={`worker-monthly-${day.key}-radio`}
                                      checked={
                                        formData.workerSurvey.monthlyMode === "firstWeekDay"
                                          ? formData.workerSurvey.monthlyFirstWeekday === day.value
                                          : formData.workerSurvey.monthlyLastWeekday === day.value
                                      }
                                      onChange={() => {
                                        if (formData.workerSurvey.monthlyMode === "firstWeekDay") {
                                          updateNestedFormData("workerSurvey", "monthlyFirstWeekday", day.value)
                                          updateNestedFormData("workerSurvey", "monthlyLastWeekday", null)
                                        } else {
                                          updateNestedFormData("workerSurvey", "monthlyLastWeekday", day.value)
                                          updateNestedFormData("workerSurvey", "monthlyFirstWeekday", null)
                                        }
                                      }}
                                      className="form-radio text-primary"
                                    />
                                    <Label
                                      htmlFor={`worker-monthly-${day.key}-radio`}
                                      className="text-sm cursor-pointer ml-2"
                                    >
                                      {day.label}
                                    </Label>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Hour selector shown after the tabs */}
          <div className="mt-4">
            <Label className="text-sm font-medium text-foreground">{t("surveySendTime") || "Hora envío"}</Label>
            <div className="mt-1">
              <div className="relative inline-block">
                <Input
                  id="surveyHour"
                  value={surveyTab === "customer" ? formData.customerSurvey.hour : formData.workerSurvey.hour}
                  onChange={(e) =>
                    updateNestedFormData(
                      surveyTab === "customer" ? "customerSurvey" : "workerSurvey",
                      "hour",
                      e.target.value
                    )
                  }
                  placeholder="20:00"
                  className="w-24 pr-8"
                />

                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                  <TimePicker
                    value={surveyTab === "customer" ? formData.customerSurvey.hour : formData.workerSurvey.hour}
                    onChange={(time) =>
                      updateNestedFormData(surveyTab === "customer" ? "customerSurvey" : "workerSurvey", "hour", time)
                    }
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
