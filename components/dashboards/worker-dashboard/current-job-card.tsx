"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coffee,
  PlayCircle,
  Play,
  Pause,
  Fingerprint,
  CheckSquare,
  Square,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AnimatedLoader } from "@/components/animated-loader";
import ClientIcon from "@/icons/Menu/clients.svg";
import JobsIcon from "@/icons/Menu/Jobs.svg";

interface JobAssignment {
  id: number;
  publicId?: string;
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
  onFillSurvey?: (job: JobAssignment) => void;
  surveyState?: "pending" | "done" | null;
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
  onFillSurvey,
  surveyState,
  getCurrentSessionTime,
  getCurrentBreakTime,
  formatTimeShort,
  actionLoading = false,
}: CurrentJobCardProps) {
  const { t } = useTranslation("worker-dashboard");
  const { t: tf } = useTranslation("fichaje-cards");
  const { session } = useAuth();
  const [selectedBreakType, setSelectedBreakType] = useState("");
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string | null>(
    null
  );
  const [todayTasks, setTodayTasks] = useState<any>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Fetch today's tasks grouped by work center
  const fetchTodayTasks = async () => {
    if (!job || !session?.accessToken) return;

    setLoadingTasks(true);
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/jobs/${job.publicId || job.id}/today-tasks`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.isSuccess) {
          setTodayTasks(result.data);
          // Auto-select first work center if available
          if (
            result.data.workCenters &&
            result.data.workCenters.length > 0 &&
            !selectedWorkCenter
          ) {
            setSelectedWorkCenter(
              String(result.data.workCenters[0].workCenterId)
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch today's tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, [job, session]);

  const breakTypes = [
    { value: "personal", label: t("personal") },
    { value: "tea_smoking", label: t("teaSmoking") },
    { value: "official_work", label: t("officialWork") },
    { value: "lunch", label: t("lunch") },
    { value: "prayer", label: t("prayer") },
    { value: "other", label: t("other") },
  ];

  // Handle task completion - mark as complete and reload tasks
  const handleTaskToggleConfirm = async (taskId: number) => {
    try {
      setLoadingTasks(true);
      await onTaskToggle(job.id, taskId);

      // Wait a bit for the backend to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reload tasks to show updated completion status
      await fetchTodayTasks();

      console.log("✅ Task marked and UI refreshed");
    } catch (error) {
      console.error("Failed to toggle task:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Badge
            variant="outline"
            className="font-mono bg-muted border-border"
          >
            {job.jobId}
          </Badge>
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
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <ClientIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {job.client.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <JobsIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <span className="text-base font-medium text-purple-600 dark:text-purple-400">
                  {job.title}
                </span>
              </div>
            </div>

            {/* Today's Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t("todayTasks")}
                </h4>
                {todayTasks && (
                  <Badge variant="outline" className="text-xs">
                    {todayTasks.totalCompleted}/{todayTasks.totalTasks}{" "}
                    {t("completed")}
                  </Badge>
                )}
              </div>

              {/* Work Center Selector */}
              {todayTasks &&
                todayTasks.workCenters &&
                todayTasks.workCenters.length > 0 && (
                  <div className="mb-3">
                    <Select
                      value={selectedWorkCenter || undefined}
                      onValueChange={setSelectedWorkCenter}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("selectWorkCenter")} />
                      </SelectTrigger>
                      <SelectContent>
                        {todayTasks.workCenters.map((wc: any) => (
                          <SelectItem
                            key={wc.workCenterId || "null"}
                            value={String(wc.workCenterId)}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{wc.workCenterName}</span>
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                {wc.completedTasks}/{wc.totalTasks}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              {/* Tasks List */}
              <div className="space-y-2">
                {loadingTasks ? (
                  <AnimatedLoader size={24} className="text-center py-4" />
                ) : todayTasks && selectedWorkCenter ? (
                  (() => {
                    const workCenter = todayTasks.workCenters.find(
                      (wc: any) =>
                        String(wc.workCenterId) === selectedWorkCenter
                    );
                    const tasks = workCenter?.tasks || [];

                    return tasks.length > 0 ? (
                      tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-lg border ${
                            task.isCompleted
                              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                              : "bg-muted border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {!task.isCompleted ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 mt-0.5"
                                    disabled={
                                      job.isOnBreak ||
                                      actionLoading ||
                                      loadingTasks
                                    }
                                  >
                                    <Square className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("confirmTaskCompletion")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("confirmTaskDescription", {
                                        taskName: task.name,
                                      })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={loadingTasks}>
                                      {t("cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleTaskToggleConfirm(task.id)
                                      }
                                      disabled={loadingTasks}
                                      className="flex items-center gap-2"
                                    >
                                      {loadingTasks ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                          {t("loading")}
                                        </>
                                      ) : (
                                        t("confirm")
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                            )}

                            <div className="flex-1">
                              <div
                                className={`font-medium ${
                                  task.isCompleted
                                    ? "text-green-700 dark:text-green-400 line-through"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {task.name}
                              </div>

                              {/* Task Note/Observation */}
                              {task.note && (
                                <div className="mt-2">
                                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                    {t("note")}:
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                    {task.note}
                                  </div>
                                </div>
                              )}

                              {task.expectedDuration && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {t("duration")}: {task.expectedDuration}h
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        {t("noTasksForWorkCenter")}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {t("noTasksScheduled")}
                  </div>
                )}
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
                  <div className="text-sm text-orange-600 dark:text-orange-400">
                    {t("breakTime")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-1">
                    {getCurrentSessionTime(job)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    {t("workingTime")}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted p-3 rounded-lg border border-border text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.checkInTime ? formatTimeShort(job.checkInTime) : "---"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t("checkIn")}
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg border border-border text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.shift.scheduleType === "fixed" && job.shift.endTime
                    ? job.shift.endTime
                    : "Flexible"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t("expectedOut")}
                </div>
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
                  <Select
                    value={selectedBreakType}
                    onValueChange={setSelectedBreakType}
                  >
                    <SelectTrigger className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        <SelectValue placeholder={t("breakOut")} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {breakTypes.map((breakType) => (
                        <SelectItem
                          key={breakType.value}
                          value={breakType.value}
                        >
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

              {onFillSurvey && surveyState && (
                <Button
                  onClick={() => onFillSurvey(job)}
                  variant="outline"
                  className="w-full mt-2 border-[#662D91] text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  disabled={surveyState === "done" || actionLoading}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  {surveyState === "done" ? tf("surveySent") : tf("fillSurvey")}
                </Button>
              )}
            </div>

            {/* Break Summary */}
            {job.totalBreakTime > 0 && (
              <div className="bg-muted p-3 rounded-lg border border-border text-center">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.totalBreakTime} {t("minutes")}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t("totalBreakTime")}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
