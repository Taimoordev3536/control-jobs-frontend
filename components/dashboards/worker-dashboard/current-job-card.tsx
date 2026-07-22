"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [toggling, setToggling] = useState(false);

  // getCurrentSessionTime/getCurrentBreakTime read `new Date()` while rendering,
  // so the clocks only advance when this card re-renders. Nothing was driving
  // that, which froze them until a refetch or a page refresh. Tick once a second
  // while a session is open; stop once the worker checks out.
  const isSessionLive = !!job?.checkInTime && !job?.checkOutTime;
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (!isSessionLive) return;
    const id = setInterval(() => setClockTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isSessionLive]);

  // Fetch today's tasks grouped by work center
  const { data: todayTasks = null, isFetching, refetch } = useQuery<any>({
    queryKey: ["jobs", job?.publicId || job?.id, "today-tasks"],
    enabled: !!job && !!session?.accessToken,
    queryFn: async () => {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/jobs/${job.publicId || job.id}/today-tasks`, {
        headers: { Authorization: `Bearer ${session!.accessToken}` },
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.isSuccess ? result.data : null;
    },
  });
  const loadingTasks = isFetching || toggling;

  // Auto-select the first work center once tasks load.
  useEffect(() => {
    if (todayTasks?.workCenters?.length && !selectedWorkCenter) {
      setSelectedWorkCenter(String(todayTasks.workCenters[0].workCenterId));
    }
  }, [todayTasks, selectedWorkCenter]);

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
      setToggling(true);
      await onTaskToggle(job.id, taskId);

      // Wait a bit for the backend to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reload tasks to show updated completion status
      await refetch();
    } catch (error) {
      console.error("Failed to toggle task:", error);
    } finally {
      setToggling(false);
    }
  };

  return (
    // This is the only live element on the dashboard — a running clock plus the
    // actions that stop it. It carries brand colour and elevation so it reads as
    // primary against the plain informational cards below it.
    <Card
      className="border-2 border-[#662D91] dark:border-purple-500
                 bg-gradient-to-b from-white to-purple-50
                 dark:from-gray-900 dark:to-purple-950/30
                 shadow-[0_10px_34px_-10px_rgba(102,45,145,0.45),0_2px_6px_-2px_rgba(102,45,145,0.25)]
                 dark:shadow-[0_10px_34px_-10px_rgba(0,0,0,0.75)]"
    >
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
                {/* Pulsing dot: the session is running right now. Suppressed for
                    users who ask the OS to reduce motion. */}
                <span className="relative flex w-2 h-2 mr-1.5" aria-hidden="true">
                  <span className="motion-safe:animate-ping absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-green-600" />
                </span>
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
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-orange-200 dark:border-orange-800 shadow-[0_4px_14px_-4px_rgba(194,65,12,0.30)] dark:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)]">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums text-orange-700 dark:text-orange-400 mb-1">
                    {getCurrentBreakTime(job)}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">
                    {t("breakTime")}
                  </div>
                </div>
              </div>
            ) : (
              // Solid panel, not a tint: the card behind it is now purple, so a
              // purple-tinted timer would blend into it.
              <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-purple-200 dark:border-purple-800 shadow-[0_4px_14px_-4px_rgba(102,45,145,0.30)] dark:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)]">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums text-purple-700 dark:text-purple-400 mb-1">
                    {getCurrentSessionTime(job)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    {t("workingTime")}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-border text-center shadow-[0_2px_10px_-3px_rgba(102,45,145,0.22)] dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.55)]">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.checkInTime ? formatTimeShort(job.checkInTime) : "---"}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t("checkIn")}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-border text-center shadow-[0_2px_10px_-3px_rgba(102,45,145,0.22)] dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.55)]">
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {job.shift.scheduleType === "fixed" && job.shift.endTime
                    ? job.shift.endTime
                    : t("free")}
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
                // Lifts on hover and presses down on tap — the one place literal
                // depth belongs, because it maps to a physical button.
                className="w-full bg-purple-600 hover:bg-purple-700 text-white
                           shadow-[0_6px_16px_-6px_rgba(102,45,145,0.7)]
                           hover:shadow-[0_10px_22px_-8px_rgba(102,45,145,0.8)]
                           active:translate-y-px active:shadow-[0_3px_10px_-6px_rgba(102,45,145,0.7)]
                           transition-all"
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
              <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-border text-center shadow-[0_2px_10px_-3px_rgba(102,45,145,0.22)] dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.55)]">
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
