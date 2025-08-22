"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Activity, MapPin, Coffee, PlayCircle, Play, Pause, Fingerprint, CheckSquare, Square } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface JobAssignment {
  id: number;
  jobId: string;
  title: string;
  client: {
    id: number;
    name: string;
  };
  workCenter: {
    id: number;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  shift: {
    type: "morning" | "afternoon" | "evening";
    startTime?: string;
    endTime?: string;
    duration: string;
    scheduleType: "fixed" | "flexible";
  };
  status: "scheduled" | "in_progress" | "completed";
  signingMethods: {
    qrCode?: boolean;
    gps?: boolean;
    wifi?: boolean;
    ip?: boolean;
    callerId?: boolean;
  };
  tasks: Array<{
    id: number;
    name: string;
    description: string;
    completed: boolean;
    duration: string;
    timing: "during" | "after";
  }>;
  checkInTime?: Date;
  checkOutTime?: Date;
  breakTime: number;
  workedTime: number;
  expectedHours: number;
  totalHours?: number;
  breakStartTime?: Date;
  totalBreakTime: number;
  isOnBreak: boolean;
  tags: string[];
  startDate: Date;
  endDate: Date;
  hasAttendanceRecord: boolean;
  survey?: {
    rating: number;
    comments: string;
    submitted: boolean;
    submittedAt?: Date;
  };
}

interface CurrentJobCardProps {
  job: JobAssignment;
  onCheckOut: (job: JobAssignment) => void;
  onTakeBreak: (job: JobAssignment, breakType: string) => void;
  onBackToWork: (job: JobAssignment) => void;
  onTaskToggle: (jobId: number, taskId: number) => void;
  getCurrentSessionTime: (job: JobAssignment) => string;
  getCurrentBreakTime: (job: JobAssignment) => string;
  formatTimeShort: (date: Date) => string;
  actionLoading?: boolean;
}

export function CurrentJobCard({
  job,
  onCheckOut,
  onTakeBreak,
  onBackToWork,
  onTaskToggle,
  getCurrentSessionTime,
  getCurrentBreakTime,
  formatTimeShort,
  actionLoading = false,
}: CurrentJobCardProps) {
  const { t } = useTranslation("worker-dashboard");
  const [selectedBreakType, setSelectedBreakType] = useState("");

  const breakTypes = [
    { value: "personal", label: t("personal") },
    { value: "tea_smoking", label: t("teaSmoking") },
    { value: "official_work", label: t("officialWork") },
    { value: "lunch", label: t("lunch") },
    { value: "prayer", label: t("prayer") },
    { value: "other", label: t("other") },
  ];

  // const handleTaskToggleConfirm = (taskId: number) => {
  //   onTaskToggle(job.id, taskId);
  // };
// In CurrentJobCard.tsx
const handleTaskToggleConfirm = (taskId: number) => {
  onTaskToggle(job.id, taskId);
};


  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            {t("currentJob")}
          </h2>
          <Badge
            className={
              job.isOnBreak
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            }
          >
            {job.isOnBreak ? (
              <>
                <Coffee className="w-3 h-3 mr-1" />
                {t("onBreak")}
              </>
            ) : (
              <>
                <PlayCircle className="w-3 h-3 mr-1" />
                {t("inProgress")}
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Job Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{job.client.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{job.workCenter.address}</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-mono bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                {job.jobId}
              </Badge>
            </div>

            {/* Tasks */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t("tasks")}</h4>
              <div className="space-y-2">
                {job.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      task.completed
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {!task.completed ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            disabled={job.isOnBreak || actionLoading}
                          >
                            <Square className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirmTaskCompletion")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("confirmTaskDescription", { taskName: task.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleTaskToggleConfirm(task.id)}>
                              {t("confirm")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          task.completed
                            ? "text-green-700 dark:text-green-400 line-through"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {task.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{task.description}</div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{task.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Time Tracking */}
          <div className="space-y-4">
            {job.isOnBreak ? (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400 mb-1">
                    {getCurrentBreakTime(job)}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">{t("breakTime")}</div>
                </div>
              </div>
            ) : (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                    {getCurrentSessionTime(job)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">{t("workingTime")}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.checkInTime ? formatTimeShort(job.checkInTime) : "---"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t("checkIn")}</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.shift.scheduleType === "fixed" && job.shift.endTime ? job.shift.endTime : "Flexible"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t("expectedOut")}</div>
              </div>
            </div>

            {/* Break/Work Controls */}
            <div className="space-y-2">
              {job.isOnBreak ? (
                <Button
                  onClick={() => onBackToWork(job)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={actionLoading}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t("backToWork")}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Select value={selectedBreakType} onValueChange={setSelectedBreakType}>
                    <SelectTrigger className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        <SelectValue placeholder={t("breakOut")} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      {breakTypes.map((breakType) => (
                        <SelectItem key={breakType.value} value={breakType.value}>
                          {breakType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBreakType && (
                    <Button
                      onClick={() => {
                        onTakeBreak(job, selectedBreakType);
                        setSelectedBreakType("");
                      }}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
                      disabled={actionLoading}
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      {t("startBreak")}
                    </Button>
                  )}
                </div>
              )}

              <Button
                onClick={() => onCheckOut(job)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={job.isOnBreak || actionLoading}
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                {t("checkOut")}
              </Button>
            </div>

            {/* Break Summary */}
            {job.totalBreakTime > 0 && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.totalBreakTime} {t("minutes")}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{t("totalBreakTime")}</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}