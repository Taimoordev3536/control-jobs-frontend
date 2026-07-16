"use client"

import { useEffect, useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Clock, Save, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

interface PermissionSettings {
  isEnabled: boolean
  workerCanRequest: boolean
  employerCanCreate: boolean
  clientCanCreate: boolean
  maxRetroactiveDays: number
  maxRequestsPerWorkerMonth: number
  requireReason: boolean
}

interface ManualAttendancePermissionSettingsProps {
  level: "employer" | "client" | "job"
  jobId?: string // only for job-level
}

const DEFAULT_SETTINGS: PermissionSettings = {
  isEnabled: false,
  workerCanRequest: true,
  employerCanCreate: true,
  clientCanCreate: false,
  maxRetroactiveDays: 7,
  maxRequestsPerWorkerMonth: 10,
  requireReason: true,
}

export default function ManualAttendancePermissionSettings({
  level,
  jobId,
}: ManualAttendancePermissionSettingsProps) {
  const { session } = useAuth()
  const { t } = useTranslation("manual-attendance")
  const [settings, setSettings] = useState<PermissionSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const getEndpoint = useCallback(() => {
    const base = `${process.env.NEXT_PUBLIC_API_BASE_URL}/manual-attendance/permissions`
    switch (level) {
      case "employer": return `${base}/employer`
      case "client": return `${base}/client`
      case "job": return `${base}/job/${jobId}`
    }
  }, [level, jobId])

  const { data: fetchedSettings, isLoading } = useQuery<PermissionSettings | null>({
    queryKey: ["manual-attendance", "permissions", level, jobId],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const res = await fetch(getEndpoint(), {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const result = await res.json()
      if (!result.data) return null
      return {
        isEnabled: result.data.isEnabled ?? DEFAULT_SETTINGS.isEnabled,
        workerCanRequest: result.data.workerCanRequest ?? DEFAULT_SETTINGS.workerCanRequest,
        employerCanCreate: result.data.employerCanCreate ?? DEFAULT_SETTINGS.employerCanCreate,
        clientCanCreate: result.data.clientCanCreate ?? DEFAULT_SETTINGS.clientCanCreate,
        maxRetroactiveDays: result.data.maxRetroactiveDays ?? DEFAULT_SETTINGS.maxRetroactiveDays,
        maxRequestsPerWorkerMonth: result.data.maxRequestsPerWorkerMonth ?? DEFAULT_SETTINGS.maxRequestsPerWorkerMonth,
        requireReason: result.data.requireReason ?? DEFAULT_SETTINGS.requireReason,
      }
    },
  })

  // Seed the editable form once loaded (no invalidation -> edits kept).
  useEffect(() => {
    if (fetchedSettings) setSettings(fetchedSettings)
  }, [fetchedSettings])

  const handleSave = async () => {
    if (!session?.accessToken) return
    setIsSaving(true)
    setSaved(false)
    try {
      const res = await fetch(getEndpoint(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof PermissionSettings>(
    key: K,
    value: PermissionSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            {t("manualAttendanceSettings") || "Manual Attendance Settings"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Master toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t("enableManualAttendance") || "Enable Manual Attendance"}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("enableManualAttendanceDesc") || "Allow manual attendance entries for jobs"}
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(v) => updateSetting("isEnabled", v)}
            />
          </div>

          {settings.isEnabled && (
            <>
              <div className="border-t border-border pt-4" />

              {/* Who can create */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("whoCanCreate") || "Who Can Create Requests"}
                </p>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t("workersCanRequest") || "Workers can request"}</Label>
                  <Switch
                    checked={settings.workerCanRequest}
                    onCheckedChange={(v) => updateSetting("workerCanRequest", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t("employerCanCreate") || "Employer can create"}</Label>
                  <Switch
                    checked={settings.employerCanCreate}
                    onCheckedChange={(v) => updateSetting("employerCanCreate", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t("clientCanCreate") || "Client can create"}</Label>
                  <Switch
                    checked={settings.clientCanCreate}
                    onCheckedChange={(v) => updateSetting("clientCanCreate", v)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4" />

              {/* Limits */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("limits") || "Limits"}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("maxRetroactiveDays") || "Max retroactive days"}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.maxRetroactiveDays}
                      onChange={(e) => updateSetting("maxRetroactiveDays", parseInt(e.target.value) || 7)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">{t("maxRequestsPerMonth") || "Max requests/month/worker"}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.maxRequestsPerWorkerMonth}
                      onChange={(e) => updateSetting("maxRequestsPerWorkerMonth", parseInt(e.target.value) || 10)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4" />

              {/* Requirements */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{t("requireReason") || "Require reason"}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("requireReasonDesc") || "Workers must provide a reason for their request"}
                  </p>
                </div>
                <Switch
                  checked={settings.requireReason}
                  onCheckedChange={(v) => updateSetting("requireReason", v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? (t("saved") || "Saved!") : (t("saveChanges") || "Save Changes")}
        </Button>
      </div>
    </div>
  )
}
