"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import { isValidDuration } from "@/components/ui/time-field";

// Import all form components
import DefinitionForm from "./DefinitionForm";
import SchedulesForm from "./SchedulesForm";
import SigningMethodsForm from "./SigningMethodsForm";
import AlertsForm from "./AlertsForm";
import TasksForm from "./TasksForm";
import SurveysForm from "./SurveysForm";

// Import types and utilities
import type { Client, WorkCenter, Worker, ShiftKey } from "./types";
import {
  createInitialFormData,
  createInitialSchedule,
  computeMultiDayTotals,
  toISODate,
  parseDurationToMinutes,
  minutesToTime,
  timeToMinutes,
  DAY_KEYS,
} from "./utils";

interface JobFormCoreProps {
  jobId?: string;
  mode: "create" | "edit";
  onComplete: (job: any) => void;
  onCancel?: () => void;
}

export default function JobFormCore({
  jobId,
  mode,
  onComplete,
  onCancel,
}: JobFormCoreProps) {
  const [currentMainStep, setCurrentMainStep] = useState(1);
  const [currentSigningStep, setCurrentSigningStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [enableTasks, setEnableTasks] = useState(false);
  const [enableSurveys, setEnableSurveys] = useState(false);
  const [workCenterTooltipOpen, setWorkCenterTooltipOpen] = useState(false);
  const [workersTooltipOpen, setWorkersTooltipOpen] = useState(false);
  const [seasonTooltipOpen, setSeasonTooltipOpen] = useState(false);
  const [delayTooltipOpen, setDelayTooltipOpen] = useState(false);
  const [durationTooltipOpen, setDurationTooltipOpen] = useState(false);
  const [workCenterQuery, setWorkCenterQuery] = useState("");
  const [workerQuery, setWorkerQuery] = useState("");

  const { t } = useTranslation("employer-dashboard");
  const { session } = useAuth();

  // API Data
  const [clients, setClients] = useState<Client[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const [formData, setFormData] = useState(createInitialFormData);
  const pairingRegistryRef = useRef<Map<string, string>>(new Map());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  // Drag & drop for tasks
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTempValues({});
  }, [formData]);

  // Memoized constants
  const mainSteps = useMemo(
    () => [
      { number: 1, label: t("signings") || "Signings" },
      { number: 2, label: t("tasks") || "Tasks" },
      { number: 3, label: t("surveys") || "Surveys" },
    ],
    [t]
  );

  const signingSteps = useMemo(
    () => [
      { number: 1, label: t("definition") || "Definition" },
      { number: 2, label: t("schedules") || "Schedules" },
      { number: 3, label: t("signingMethods") || "Signing methods" },
      { number: 4, label: t("alerts") || "Alerts" },
    ],
    [t]
  );

  const daysOfWeek = useMemo(
    () => [
      { key: "monday", label: t("monday") || "Monday" },
      { key: "tuesday", label: t("tuesday") || "Tuesday" },
      { key: "wednesday", label: t("wednesday") || "Wednesday" },
      { key: "thursday", label: t("thursday") || "Thursday" },
      { key: "friday", label: t("friday") || "Friday" },
      { key: "saturday", label: t("saturday") || "Saturday" },
      { key: "sunday", label: t("sunday") || "Sunday" },
    ],
    [t]
  );

  // API fetchers
  const fetchWithAuth = useCallback(
    async (url: string) => {
      if (!session?.accessToken) return null;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      });
      return response.ok ? response.json() : null;
    },
    [session?.accessToken]
  );

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/for-add-job`
      );
      let apiClients = data?.data || [];
      const userId = session?.user?.id ? Number(session.user.id) : null;
      const userName =
        session?.user?.name ||
        `${session?.user?.firstName || ""} ${
          session?.user?.lastName || ""
        }`.trim();

      apiClients = apiClients.map((c: any) => ({
        ...c,
        id: c.id !== null ? Number(c.id) : c.id,
        isSelf: userId && Number(c.id) === userId,
      }));

      if (
        userId &&
        !apiClients.some((c: any) => Number(c.id) === userId)
      ) {
        apiClients = [
          {
            id: userId,
            name: userName || "Yourself",
            locality: "",
            type: "",
            responsible: "",
            telephones: "",
            asset: "yeah",
            isSelf: true,
            isEmployer: true,
          },
          ...apiClients,
        ];
      } else {
        apiClients.sort((a: any, b: any) => {
          if (a.isSelf === b.isSelf) return 0;
          return a.isSelf ? -1 : 1;
        });
      }

      setClients(apiClients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [fetchWithAuth, session]);

  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true);
    try {
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`
      );
      setWorkers(data?.data || []);
    } catch (error) {
      console.error("Error fetching workers:", error);
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  }, [fetchWithAuth]);

  const fetchWorkCenters = useCallback(async () => {
    if (formData.clientId == null || formData.clientId === "") {
      setWorkCenters([]);
      return;
    }

    const clientIdNum = Number(formData.clientId);
    if (isNaN(clientIdNum)) {
      setWorkCenters([]);
      return;
    }

    // Check if this client is the employer themselves
    const userId = session?.user?.id ? Number(session.user.id) : null;
    const isEmployerSelf = userId && clientIdNum === userId;

    setLoadingWorkCenters(true);
    try {
      // Use employer endpoint if creating job for themselves
      const endpoint = isEmployerSelf
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/employer/work-centers`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientIdNum}/work-centers`;

      const data = await fetchWithAuth(endpoint);
      const apiCenters = Array.isArray(data) ? data : data?.data || [];
      const normalized = (apiCenters || []).map((wc: any) => ({
        ...wc,
        id: Number(wc.id),
        clientId:
          wc.clientId !== null && wc.clientId !== undefined
            ? Number(wc.clientId)
            : null,
      }));
      setWorkCenters(normalized);
    } catch (error) {
      console.error("Error fetching work centers:", error);
      setWorkCenters([]);
    } finally {
      setLoadingWorkCenters(false);
    }
  }, [formData.clientId, fetchWithAuth, session]);

  // Fetch job data for edit mode
  useEffect(() => {
    if (mode === "edit" && jobId) {
      const fetchJobData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}`,
            {
              headers: {
                Authorization: `Bearer ${session?.accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch job");
          }

          const jobData = await response.json();
          const job = jobData.data || jobData;

          // Determine clientId: if null from backend and job has work centers,
          // it means employer created it for themselves, so use their user ID
          const userId = session?.user?.id ? Number(session.user.id) : null;
          let resolvedClientId = "";
          
          if (job.clientId !== null && job.clientId !== undefined) {
            resolvedClientId = String(job.clientId);
          } else if (userId && job.workCenterIds && job.workCenterIds.length > 0) {
            // Job has work centers but no clientId = employer created for themselves
            resolvedClientId = String(userId);
          }

          // Populate formData with existing job data
          setFormData((prev) => ({
            ...prev,
            denomination: job.jobName || "",
            startDate: job.startDate || "",
            endDate: job.endDate || "",
            clientId: resolvedClientId,
            workCenterIds:
              job.workCenterIds?.map((id: any) => String(id)) || [],
            workerIds: job.workerIds?.map((id: any) => String(id)) || [],
            observations: job.note || "",
            // If job has seasonal schedules with shifts, set to programming, otherwise use backend value or default to free
            scheduleType: (job.seasonalSchedules && job.seasonalSchedules.length > 0 && 
                          job.seasonalSchedules.some((ss: any) => ss.shifts && ss.shifts.length > 0))
                          ? "programming" 
                          : (job.scheduleType || "free"),

            // Transform seasonal schedules from backend array to frontend schedules object
            schedules: (() => {
              const schedules = {
                normal: {
                  monday: createInitialSchedule(),
                  tuesday: createInitialSchedule(),
                  wednesday: createInitialSchedule(),
                  thursday: createInitialSchedule(),
                  friday: createInitialSchedule(),
                  saturday: createInitialSchedule(),
                  sunday: createInitialSchedule(),
                },
                summer: {
                  monday: createInitialSchedule(),
                  tuesday: createInitialSchedule(),
                  wednesday: createInitialSchedule(),
                  thursday: createInitialSchedule(),
                  friday: createInitialSchedule(),
                  saturday: createInitialSchedule(),
                  sunday: createInitialSchedule(),
                },
              };

              // Map backend seasonal schedules to frontend structure
              if (
                job.seasonalSchedules &&
                Array.isArray(job.seasonalSchedules)
              ) {
                job.seasonalSchedules.forEach((ss: any) => {
                  const season = ss.season === "summer" ? "summer" : "normal";
                  if (ss.shifts && Array.isArray(ss.shifts)) {
                    ss.shifts.forEach((shift: any) => {
                      const startDay = shift.startWeekday?.toLowerCase();
                      const endDay = shift.endWeekday?.toLowerCase();
                      const startTime = shift.baseStartTime ? shift.baseStartTime.substring(0, 5) : "";
                      const endTime = shift.baseEndTime ? shift.baseEndTime.substring(0, 5) : "";

                      const daysOfWeek = [
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday",
                        "sunday",
                      ];

                      // Determine shift period - check if slots are already occupied
                      const determineShiftPeriod = (dayKey: string, hour: number): ShiftKey => {
                        // First try to determine by time
                        let preferredPeriod: ShiftKey = "morning";
                        if (hour >= 12 && hour < 17) preferredPeriod = "afternoon";
                        else if (hour >= 17) preferredPeriod = "evening";
                        
                        // Check if preferred period is available
                        const daySchedule = schedules[season][dayKey as keyof typeof schedules.normal];
                        if (daySchedule && !daySchedule[preferredPeriod].start && !daySchedule[preferredPeriod].end) {
                          return preferredPeriod;
                        }
                        
                        // If preferred is taken, find first available slot
                        const periods: ShiftKey[] = ["morning", "afternoon", "evening"];
                        for (const period of periods) {
                          if (daySchedule && !daySchedule[period].start && !daySchedule[period].end) {
                            return period;
                          }
                        }
                        
                        // If all slots full, return preferred (will overwrite)
                        return preferredPeriod;
                      };

                      let shiftPeriod: ShiftKey = "morning";
                      if (startTime && startDay) {
                        const hour = parseInt(startTime.split(":")[0]);
                        shiftPeriod = determineShiftPeriod(startDay, hour);
                      }

                      // Check if it's a single day shift or multi-day shift
                      if (startDay === endDay) {
                        // Single day shift: put both start and end time on the same day
                        if (
                          schedules[season][
                            startDay as keyof typeof schedules.normal
                          ]
                        ) {
                          schedules[season][
                            startDay as keyof typeof schedules.normal
                          ][shiftPeriod] = {
                            start: startTime,
                            end: endTime,
                          };

                          // Calculate and accumulate total hours for this shift
                          if (startTime && endTime) {
                            const startMinutes = timeToMinutes(startTime);
                            const endMinutes = timeToMinutes(endTime);
                            let shiftMinutes = endMinutes - startMinutes;

                            // Handle overnight shifts (end time is next day)
                            if (shiftMinutes < 0) {
                              shiftMinutes += 24 * 60;
                            }

                            // Get existing total and add this shift's hours
                            const existingTotal = schedules[season][
                              startDay as keyof typeof schedules.normal
                            ].total || "00:00";
                            const existingMinutes = timeToMinutes(existingTotal);
                            const newTotalMinutes = existingMinutes + shiftMinutes;

                            schedules[season][
                              startDay as keyof typeof schedules.normal
                            ].total = minutesToTime(newTotalMinutes);
                          }
                        }
                      } else {
                        // Multi-day shift: put start time on start day, end time on end day
                        // Also calculate hours for each day in between
                        const daysOrder = [
                          "monday",
                          "tuesday",
                          "wednesday",
                          "thursday",
                          "friday",
                          "saturday",
                          "sunday",
                        ];
                        const startIdx = daysOrder.indexOf(startDay);
                        const endIdx = daysOrder.indexOf(endDay);

                        if (startIdx !== -1 && endIdx !== -1) {
                          const startMinutes = timeToMinutes(startTime);
                          const endMinutes = timeToMinutes(endTime);

                          // Start day: from start time to midnight (24:00)
                          if (
                            schedules[season][
                              startDay as keyof typeof schedules.normal
                            ]
                          ) {
                            const hoursOnStartDay =
                              (24 * 60 - startMinutes) / 60;
                            schedules[season][
                              startDay as keyof typeof schedules.normal
                            ][shiftPeriod] = {
                              start: startTime,
                              end: "",
                            };
                            schedules[season][
                              startDay as keyof typeof schedules.normal
                            ].total = minutesToTime(
                              Math.floor(hoursOnStartDay * 60)
                            );
                          }

                          // Middle days: full 24 hours each
                          let currentIdx = startIdx + 1;
                          while (currentIdx < endIdx) {
                            const dayKey = daysOrder[currentIdx % 7];
                            if (
                              schedules[season][
                                dayKey as keyof typeof schedules.normal
                              ]
                            ) {
                              schedules[season][
                                dayKey as keyof typeof schedules.normal
                              ].total = "24:00";
                            }
                            currentIdx++;
                          }

                          // End day: from midnight to end time
                          if (
                            schedules[season][
                              endDay as keyof typeof schedules.normal
                            ]
                          ) {
                            const hoursOnEndDay = endMinutes / 60;
                            schedules[season][
                              endDay as keyof typeof schedules.normal
                            ][shiftPeriod] = {
                              start: "",
                              end: endTime,
                            };
                            schedules[season][
                              endDay as keyof typeof schedules.normal
                            ].total = minutesToTime(
                              Math.floor(hoursOnEndDay * 60)
                            );
                          }
                        }
                      }
                    });
                  }
                });
              }

              return schedules;
            })(),

            // Keep seasonal schedules for reference
            seasonalSchedules:
              job.seasonalSchedules?.map((ss: any) => ({
                season: ss.season,
                startDate: ss.startDate || "",
                endDate: ss.endDate || "",
                totalWeekHours: ss.totalWeekHours || 0,
                shifts:
                  ss.shifts?.map((shift: any) => ({
                    startWeekday: shift.startWeekday,
                    endWeekday: shift.endWeekday,
                    baseStartTime: shift.baseStartTime,
                    baseEndTime: shift.baseEndTime,
                    isContinuous: shift.isContinuous || false,
                    totalHours: shift.totalHours || 0,
                  })) || [],
              })) || [],

            // Load season periods (dates) for display in UI
            seasonPeriods:
              job.seasonalSchedules
                ?.filter((ss: any) => ss.startDate || ss.endDate)
                .map((ss: any) => ({
                  season: ss.season,
                  startDate: ss.startDate ? ss.startDate.replace("-", "/") : "", // Convert DD-MM to DD/MM for display
                  endDate: ss.endDate ? ss.endDate.replace("-", "/") : "",
                })) || [],

            // Transform signing methods from backend format to frontend format
            signingMethods: (() => {
              const methods = {
                mobile: { wifi: false, gps: false, ip: false, qrCode: false },
                laptop: { wifi: false, ip: false },
                phone: { callerId: false },
              };

              if (job.signingMethods && Array.isArray(job.signingMethods)) {
                job.signingMethods.forEach((sm: any) => {
                  const deviceType =
                    sm.methodType === "pc" ? "laptop" : sm.methodType;
                  if (
                    deviceType &&
                    methods[deviceType as keyof typeof methods]
                  ) {
                    const details = sm.methodDetails || [];
                    details.forEach((detail: string) => {
                      const key = detail.toLowerCase();
                      // Map backend field names to frontend field names
                      if (key === "web" || key === "wifi") {
                        if (deviceType === "mobile") {
                          methods.mobile.wifi = true;
                        } else if (deviceType === "laptop") {
                          methods.laptop.wifi = true;
                        }
                      } else if (key === "qrcode") {
                        if (deviceType === "mobile") {
                          methods.mobile.qrCode = true;
                        }
                      } else if (key === "gps") {
                        if (deviceType === "mobile") {
                          methods.mobile.gps = true;
                        }
                      } else if (key === "ip") {
                        if (deviceType === "mobile") {
                          methods.mobile.ip = true;
                        } else if (deviceType === "laptop") {
                          methods.laptop.ip = true;
                        }
                      } else if (key === "callerid") {
                        if (deviceType === "phone") {
                          methods.phone.callerId = true;
                        }
                      }
                    });
                  }
                });
              }

              return methods;
            })(),

            // Map alerts to entrance/exit format
            entrance: (() => {
              const entryAlert = job.alerts?.find(
                (a: any) => a.alertType === "sign_in"
              );
              // Check if triggerTime (delay) is set and valid
              const triggerTimeValue = entryAlert?.triggerTime ? parseInt(String(entryAlert.triggerTime)) : 0;
              const hasDelay = triggerTimeValue > 0;
              
              return {
                whenSigningIn: !!entryAlert,
                delay: hasDelay,
                delayValue: hasDelay ? String(triggerTimeValue) : "15",
              };
            })(),

            exit: (() => {
              const exitAlert = job.alerts?.find(
                (a: any) => a.alertType === "sign_out"
              );
              // Check if minDuration is set and valid
              const minDurationValue = exitAlert?.minDuration || 0;
              const hasDuration = minDurationValue > 0;
              
              return {
                whenSigningIn: !!exitAlert,
                duration: hasDuration,
                durationValue: hasDuration ? String(minDurationValue) : "30",
              };
            })(),

            // Map surveys - transform backend field names to frontend format
            customerSurvey: job.customerSurvey
              ? {
                  questionText: job.customerSurvey.questionText || "",
                  monitoringValue: job.customerSurvey.rateDigit
                    ? [job.customerSurvey.rateDigit]
                    : [5],
                  textAlertTracking: job.customerSurvey.textAlertTracking || "",
                  farewellText: job.customerSurvey.greetingText || "",
                  periodicity: job.customerSurvey.periodicity || "daily",
                  periodicityValue: String(job.customerSurvey.interval || 1),
                  hour: job.customerSurvey.sendTime ? job.customerSurvey.sendTime.substring(0, 5) : "08:00",
                  interval: job.customerSurvey.interval || 1,
                  weeklyDays: (() => {
                    try {
                      const data = job.customerSurvey.weeklyDays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyDays: (() => {
                    try {
                      const data = job.customerSurvey.monthlyDays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyWeekdays: (() => {
                    try {
                      const data = job.customerSurvey.monthlyWeekdays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyMode: (() => {
                    const monthlyDays = job.customerSurvey.monthlyDays;
                    const monthlyWeekdays = job.customerSurvey.monthlyWeekdays;
                    const hasMonthlyDays = Array.isArray(monthlyDays)
                      ? monthlyDays.length > 0
                      : false;
                    const hasMonthlyWeekdays = Array.isArray(monthlyWeekdays)
                      ? monthlyWeekdays.length > 0
                      : false;
                    if (
                      job.customerSurvey.monthlyStartWeekday !== null &&
                      job.customerSurvey.monthlyStartWeekday !== undefined
                    )
                      return "firstWeekDay";
                    if (
                      job.customerSurvey.monthlyEndWeekday !== null &&
                      job.customerSurvey.monthlyEndWeekday !== undefined
                    )
                      return "lastWeekDay";
                    if (hasMonthlyWeekdays) return "weekdays";
                    return "dates";
                  })(),
                  monthlyFirstWeekday:
                    job.customerSurvey.monthlyStartWeekday !== undefined &&
                    job.customerSurvey.monthlyStartWeekday !== null
                      ? typeof job.customerSurvey.monthlyStartWeekday ===
                        "string"
                        ? parseInt(job.customerSurvey.monthlyStartWeekday)
                        : job.customerSurvey.monthlyStartWeekday
                      : null,
                  monthlyLastWeekday:
                    job.customerSurvey.monthlyEndWeekday !== undefined &&
                    job.customerSurvey.monthlyEndWeekday !== null
                      ? typeof job.customerSurvey.monthlyEndWeekday === "string"
                        ? parseInt(job.customerSurvey.monthlyEndWeekday)
                        : job.customerSurvey.monthlyEndWeekday
                      : null,
                }
              : {
                  questionText: "",
                  monitoringValue: [5],
                  textAlertTracking: "",
                  farewellText: "",
                  periodicity: "daily",
                  periodicityValue: "1",
                  hour: "08:00",
                  interval: 1,
                  weeklyDays: [],
                  monthlyDays: [],
                  monthlyWeekdays: [],
                  monthlyMode: "dates",
                  monthlyFirstWeekday: null,
                  monthlyLastWeekday: null,
                },
            workerSurvey: job.workerSurvey
              ? {
                  questionText: job.workerSurvey.questionText || "",
                  monitoringValue: job.workerSurvey.rateDigit
                    ? [job.workerSurvey.rateDigit]
                    : [5],
                  textAlertTracking: job.workerSurvey.textAlertTracking || "",
                  farewellText: job.workerSurvey.greetingText || "",
                  periodicity: job.workerSurvey.periodicity || "daily",
                  periodicityValue: String(job.workerSurvey.interval || 1),
                  hour: job.workerSurvey.sendTime ? job.workerSurvey.sendTime.substring(0, 5) : "08:00",
                  interval: job.workerSurvey.interval || 1,
                  weeklyDays: (() => {
                    console.log(
                      "🔍 WORKER SURVEY weeklyDays RAW:",
                      job.workerSurvey.weeklyDays
                    );
                    try {
                      const data = job.workerSurvey.weeklyDays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyDays: (() => {
                    try {
                      const data = job.workerSurvey.monthlyDays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyWeekdays: (() => {
                    try {
                      const data = job.workerSurvey.monthlyWeekdays;
                      if (!data) return [];
                      if (Array.isArray(data))
                        return data.map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      if (typeof data === "string")
                        return JSON.parse(data).map((d: any) =>
                          typeof d === "string" ? parseInt(d) : d
                        );
                      return [];
                    } catch {
                      return [];
                    }
                  })(),
                  monthlyMode: (() => {
                    const monthlyDays = job.workerSurvey.monthlyDays;
                    const monthlyWeekdays = job.workerSurvey.monthlyWeekdays;
                    const hasMonthlyDays = Array.isArray(monthlyDays)
                      ? monthlyDays.length > 0
                      : false;
                    const hasMonthlyWeekdays = Array.isArray(monthlyWeekdays)
                      ? monthlyWeekdays.length > 0
                      : false;
                    console.log("🔍 WORKER SURVEY monthlyMode detection:", {
                      monthlyDays,
                      monthlyWeekdays,
                      hasMonthlyDays,
                      hasMonthlyWeekdays,
                      monthlyStartWeekday: job.workerSurvey.monthlyStartWeekday,
                      monthlyEndWeekday: job.workerSurvey.monthlyEndWeekday,
                    });
                    if (
                      job.workerSurvey.monthlyStartWeekday !== null &&
                      job.workerSurvey.monthlyStartWeekday !== undefined
                    )
                      return "firstWeekDay";
                    if (
                      job.workerSurvey.monthlyEndWeekday !== null &&
                      job.workerSurvey.monthlyEndWeekday !== undefined
                    )
                      return "lastWeekDay";
                    if (hasMonthlyWeekdays) return "weekdays";
                    return "dates";
                  })(),
                  monthlyFirstWeekday:
                    job.workerSurvey.monthlyStartWeekday !== undefined &&
                    job.workerSurvey.monthlyStartWeekday !== null
                      ? typeof job.workerSurvey.monthlyStartWeekday === "string"
                        ? parseInt(job.workerSurvey.monthlyStartWeekday)
                        : job.workerSurvey.monthlyStartWeekday
                      : null,
                  monthlyLastWeekday:
                    job.workerSurvey.monthlyEndWeekday !== undefined &&
                    job.workerSurvey.monthlyEndWeekday !== null
                      ? typeof job.workerSurvey.monthlyEndWeekday === "string"
                        ? parseInt(job.workerSurvey.monthlyEndWeekday)
                        : job.workerSurvey.monthlyEndWeekday
                      : null,
                }
              : {
                  questionText: "",
                  monitoringValue: [5],
                  textAlertTracking: "",
                  farewellText: "",
                  periodicity: "daily",
                  periodicityValue: "1",
                  hour: "08:00",
                  interval: 1,
                  weeklyDays: [],
                  monthlyDays: [],
                  monthlyWeekdays: [],
                  monthlyMode: "dates",
                  monthlyFirstWeekday: null,
                  monthlyLastWeekday: null,
                },

            // Map tasks with full detail
            tasks:
              job.tasks?.map((task: any) => ({
                id: String(task.id || Date.now()),
                task: task.name || "",
                workCenterId:
                  task.workCenterId !== undefined && task.workCenterId !== null
                    ? task.workCenterId
                    : null,
                observations: task.note || "",
                duration: task.expectedDuration
                  ? String(task.expectedDuration)
                  : "",
                shifts: task.shift
                  ? { [task.shift]: true }
                  : { morning: false, afternoon: false, evening: false },
                toBeCarriedOut: task.timing || "during",
                periodicity: task.periodicity || "once",
                startDate: task.startDate || "",
                endDate: task.endDate || "",
                interval: task.interval || 1,
                onceDate: task.onceDate || "",
                weeklyDays: task.weeklyDays || [],
                monthlyDays: task.monthlyDays || [],
                monthlyWeekdays: task.monthlyWeekdays || [],
                monthlyMode:
                  task.monthlyDays?.length > 0
                    ? "dates"
                    : task.monthlyWeekdays?.length > 0
                    ? "weekdays"
                    : "dates",
                monthlyFirstWeekday:
                  task.monthlyStartWeekday !== undefined &&
                  task.monthlyStartWeekday !== null
                    ? task.monthlyStartWeekday
                    : null,
                monthlyLastWeekday:
                  task.monthlyEndWeekday !== undefined &&
                  task.monthlyEndWeekday !== null
                    ? task.monthlyEndWeekday
                    : null,
                yearlyMonths: task.yearlyMonths || [],
                yearlyDays: task.yearlyDays || [],
                alertTaskCompleted: task.alertTask || false,
                pendingTaskAlert: task.pendingTask || false,
              })) || [],
          }));

          if (job.tasks && job.tasks.length > 0) {
            setEnableTasks(true);
          }
          // Enable surveys if either has actual data
          if (job.customerSurvey || job.workerSurvey) {
            setEnableSurveys(true);
          }
        } catch (error) {
          console.error("Error fetching job:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchJobData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, jobId, session?.accessToken]);

  // Form update functions
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateNestedFormData = useCallback(
    (parent: string, field: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [field]: value,
        },
      }));
    },
    []
  );

  const updateScheduleTime = useCallback(
    (
      day: string,
      shift: ShiftKey,
      timeType: "start" | "end",
      value: string
    ) => {
      setFormData((prev) => {
        const newSchedules = { ...prev.schedules };
        const currentSeasonSchedules = { ...newSchedules[prev.currentSeason] };
        const daySchedule = { ...currentSeasonSchedules[day] };
        const shiftData = { ...daySchedule[shift] };
        shiftData[timeType] = value;
        daySchedule[shift] = shiftData;
        currentSeasonSchedules[day] = daySchedule;
        newSchedules[prev.currentSeason] = currentSeasonSchedules;

        const { totalsByDay, weeklyTotal, pairingRegistry } =
          computeMultiDayTotals(
            currentSeasonSchedules,
            pairingRegistryRef.current
          );
        pairingRegistryRef.current = pairingRegistry;
        DAY_KEYS.forEach((dk) => {
          currentSeasonSchedules[dk].total = totalsByDay[dk];
        });

        return {
          ...prev,
          schedules: newSchedules,
          totalWeeklyHours: weeklyTotal,
        };
      });
    },
    []
  );

  const clearCurrentSeasonSchedules = useCallback(() => {
    setFormData((prev) => {
      const season = prev.currentSeason;
      const newSchedules = { ...prev.schedules };
      newSchedules[season] = {
        monday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        tuesday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        wednesday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        thursday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        friday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        saturday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
        sunday: {
          morning: { start: "", end: "" },
          afternoon: { start: "", end: "" },
          evening: { start: "", end: "" },
          total: "00:00",
        },
      };

      const { totalsByDay, weeklyTotal, pairingRegistry } =
        computeMultiDayTotals(newSchedules[season], pairingRegistryRef.current);
      pairingRegistryRef.current = pairingRegistry;
      Object.keys(totalsByDay).forEach((dk) => {
        newSchedules[season][dk as keyof typeof newSchedules.normal].total =
          totalsByDay[dk as keyof typeof totalsByDay];
      });

      return {
        ...prev,
        schedules: newSchedules,
        totalWeeklyHours: weeklyTotal,
      };
    });

    toast({ title: "Borrado", description: "Horarios borrados" });
  }, []);

  const toggleWorkerSelection = useCallback((workerId: string) => {
    setFormData((prev) => ({
      ...prev,
      workerIds: prev.workerIds.includes(workerId)
        ? prev.workerIds.filter((id) => id !== workerId)
        : [...prev.workerIds, workerId],
    }));
  }, []);

  const toggleWorkCenterSelection = useCallback((wcId: string) => {
    setFormData((prev) => {
      const exists = prev.workCenterIds.includes(wcId);
      const newWorkCenterIds = exists
        ? prev.workCenterIds.filter((id) => id !== wcId)
        : [...prev.workCenterIds, wcId];
      return { ...prev, workCenterIds: newWorkCenterIds };
    });
  }, []);

  const updateSigningMethod = useCallback(
    (
      device: "mobile" | "laptop" | "phone",
      method: string,
      checked: boolean
    ) => {
      setFormData((prev) => {
        const deviceObj = { ...(prev.signingMethods as any)[device] };

        if (method === "wifi") {
          if (checked) {
            const newDevice: Record<string, boolean> = {};
            Object.keys(deviceObj).forEach((k) => {
              newDevice[k] = k === "wifi";
            });
            if (!("wifi" in newDevice)) newDevice["wifi"] = true;
            return {
              ...prev,
              signingMethods: { ...prev.signingMethods, [device]: newDevice },
            };
          }
          return {
            ...prev,
            signingMethods: {
              ...prev.signingMethods,
              [device]: { ...deviceObj, wifi: false },
            },
          };
        }

        if (checked) {
          return {
            ...prev,
            signingMethods: {
              ...prev.signingMethods,
              [device]: { ...deviceObj, [method]: true, wifi: false },
            },
          };
        }

        return {
          ...prev,
          signingMethods: {
            ...prev.signingMethods,
            [device]: { ...deviceObj, [method]: false },
          },
        };
      });
    },
    []
  );

  const addTaskToList = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};

    if (!formData.task.trim()) {
      newErrors.task = t("thisFieldIsRequired") || "This field is required";
      toast({
        title: t("taskRequired") || "Task Required",
        description: t("taskRequiredDescription") || "Please enter a task name",
        variant: "destructive",
      });
    }

    if (!formData.taskWorkCenterId) {
      newErrors.taskWorkCenterId = t("thisFieldIsRequired") || "This field is required";
    }

    if (!formData.duration || !formData.duration.trim()) {
      newErrors.duration = t("thisFieldIsRequired") || "This field is required";
    }

    // Validate date fields based on periodicity
    if (formData.periodicity === "once") {
      if (!formData.onceDate || !formData.onceDate.trim()) {
        newErrors.onceDate = t("thisFieldIsRequired") || "This field is required";
      }
    } else {
      if (!formData.taskStartDate || !formData.taskStartDate.trim()) {
        newErrors.taskStartDate = t("thisFieldIsRequired") || "This field is required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (!formData.task.trim()) {
        return; // Already showed toast for task name
      }
      toast({
        title: t("requiredFieldsMissing") || "Required Fields Missing",
        description: t("pleaseCompleteAllRequiredFields") || "Please complete all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.duration && !isValidDuration(formData.duration)) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid duration in hh:mm format",
        variant: "destructive",
      });
      setErrors((prev) => ({
        ...prev,
        duration: t("invalidTime") || "Invalid time",
      }));
      return;
    }

    if (formData.taskStartDate) {
      const taskStartIso = toISODate(formData.taskStartDate);
      if (!taskStartIso) {
        setErrors((prev) => ({ ...prev, taskStartDate: t("invalidDate") }));
        return;
      }
      if (formData.taskEndDate) {
        const taskEndIso = toISODate(formData.taskEndDate);
        if (!taskEndIso) {
          setErrors((prev) => ({ ...prev, taskEndDate: t("invalidDate") }));
          return;
        }
        const startObj = new Date(taskStartIso + "T00:00:00");
        const endObj = new Date(taskEndIso + "T00:00:00");
        if (endObj < startObj) {
          setErrors((prev) => ({
            ...prev,
            taskEndDate:
              t("endDateMustBeEqualOrAfterStart") ||
              "End date must be equal or after Start date",
          }));
          return;
        }
      }
    }

    const taskData = {
      task: formData.task,
      workCenterId: formData.taskWorkCenterId
        ? Number(formData.taskWorkCenterId) || null
        : null,
      observations: formData.taskObservations,
      duration: formData.duration,
      shifts: { ...formData.shifts },
      toBeCarriedOut: formData.toBeCarriedOut,
      periodicity: formData.periodicity,
      startDate: formData.taskStartDate,
      endDate: formData.taskEndDate,
      interval: formData.interval,
      onceDate: formData.onceDate,
      weeklyDays: formData.weeklyDays,
      monthlyDays: formData.monthlyDays,
      monthlyWeekdays: formData.monthlyWeekdays,
      monthlyMode: formData.monthlyMode,
      monthlyFirstWeekday: formData.monthlyFirstWeekday,
      monthlyLastWeekday: formData.monthlyLastWeekday,
      yearlyMonths: formData.yearlyMonths,
      yearlyDays: formData.yearlyDays,
      alertTaskCompleted: formData.alertTaskCompleted,
      pendingTaskAlert: formData.pendingTaskAlert,
    };

    if (editingTaskId) {
      // Update existing task
      setFormData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === editingTaskId ? { ...taskData, id: t.id } : t
        ),
        task: "",
        taskObservations: "",
        taskWorkCenterId: "",
        duration: "",
        shifts: { morning: false, afternoon: false, evening: false },
        toBeCarriedOut: "during",
        periodicity: "once",
        taskStartDate: "",
        taskEndDate: "",
        interval: 1,
        onceDate: "",
        weeklyDays: [],
        monthlyDays: [],
        monthlyWeekdays: [],
        monthlyMode: "dates",
        monthlyFirstWeekday: null,
        monthlyLastWeekday: null,
        yearlyMonths: [],
        yearlyDays: [],
        alertTaskCompleted: false,
        pendingTaskAlert: false,
      }));
      setEditingTaskId(null);
      toast({
        title: t("taskUpdated") || "Task Updated",
        description:
          t("taskUpdatedDescription") || "Task has been updated successfully",
      });
    } else {
      // Add new task
      const newTask = { ...taskData, id: Date.now().toString() };
      setFormData((prev) => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
        task: "",
        taskObservations: "",
        taskWorkCenterId: "",
        duration: "",
        shifts: { morning: false, afternoon: false, evening: false },
        toBeCarriedOut: "during",
        periodicity: "once",
        taskStartDate: "",
        taskEndDate: "",
        interval: 1,
        onceDate: "",
        weeklyDays: [],
        monthlyDays: [],
        monthlyWeekdays: [],
        monthlyMode: "dates",
        monthlyFirstWeekday: null,
        monthlyLastWeekday: null,
        yearlyMonths: [],
        yearlyDays: [],
        alertTaskCompleted: false,
        pendingTaskAlert: false,
      }));
      toast({
        title: t("taskAdded") || "Task Added",
        description:
          t("taskAddedDescription") || "Task has been added to the list",
      });
    }
  };

  const editTask = (taskId: string) => {
    const taskToEdit = formData.tasks.find((t) => t.id === taskId);
    if (!taskToEdit) return;

    console.log("🔍 FULL TASK DATA:", JSON.stringify(taskToEdit, null, 2));
    console.log("🔍 workCenterId:", taskToEdit.workCenterId);
    console.log("🔍 startDate:", taskToEdit.startDate);
    console.log("🔍 endDate:", taskToEdit.endDate);
    console.log("🔍 onceDate:", taskToEdit.onceDate);

    setFormData((prev) => ({
      ...prev,
      task: taskToEdit.task,
      taskObservations: taskToEdit.observations || "",
      taskWorkCenterId:
        taskToEdit.workCenterId !== null &&
        taskToEdit.workCenterId !== undefined
          ? String(taskToEdit.workCenterId)
          : "",
      duration: taskToEdit.duration || "",
      shifts: { ...taskToEdit.shifts },
      toBeCarriedOut: (taskToEdit.toBeCarriedOut === "during" || taskToEdit.toBeCarriedOut === "before" || taskToEdit.toBeCarriedOut === "after") 
        ? taskToEdit.toBeCarriedOut 
        : "during" as const,
      periodicity: taskToEdit.periodicity,
      taskStartDate: taskToEdit.startDate || "",
      taskEndDate: taskToEdit.endDate || "",
      interval: taskToEdit.interval,
      onceDate: taskToEdit.onceDate || "",
      weeklyDays: (taskToEdit.weeklyDays || []).map((d: any) =>
        typeof d === "string" ? parseInt(d) : d
      ),
      monthlyDays: (taskToEdit.monthlyDays || []).map((d: any) =>
        typeof d === "string" ? parseInt(d) : d
      ),
      monthlyWeekdays: (taskToEdit.monthlyWeekdays || []).map((d: any) =>
        typeof d === "string" ? parseInt(d) : d
      ),
      monthlyMode: (taskToEdit.monthlyMode === "dates" || taskToEdit.monthlyMode === "weekdays" || taskToEdit.monthlyMode === "firstWeekDay" || taskToEdit.monthlyMode === "lastWeekDay")
        ? taskToEdit.monthlyMode
        : "dates" as const,
      monthlyFirstWeekday:
        taskToEdit.monthlyFirstWeekday !== null &&
        taskToEdit.monthlyFirstWeekday !== undefined
          ? typeof taskToEdit.monthlyFirstWeekday === "string"
            ? parseInt(taskToEdit.monthlyFirstWeekday)
            : taskToEdit.monthlyFirstWeekday
          : null,
      monthlyLastWeekday:
        taskToEdit.monthlyLastWeekday !== null &&
        taskToEdit.monthlyLastWeekday !== undefined
          ? typeof taskToEdit.monthlyLastWeekday === "string"
            ? parseInt(taskToEdit.monthlyLastWeekday)
            : taskToEdit.monthlyLastWeekday
          : null,
      yearlyMonths: (taskToEdit.yearlyMonths || []).map((m: any) =>
        typeof m === "string" ? parseInt(m) : m
      ),
      yearlyDays: (taskToEdit.yearlyDays || []).map((d: any) =>
        typeof d === "string" ? parseInt(d) : d
      ),
      alertTaskCompleted: taskToEdit.alertTaskCompleted || false,
      pendingTaskAlert: taskToEdit.pendingTaskAlert || false,
    }));
    setEditingTaskId(taskId);

    console.log(
      "🔍 AFTER SETTING - taskWorkCenterId in prev state:",
      formData.taskWorkCenterId
    );
    console.log(
      "🔍 AFTER SETTING - taskStartDate in prev state:",
      formData.taskStartDate
    );

    // Scroll to top of the form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setFormData((prev) => ({
      ...prev,
      task: "",
      taskObservations: "",
      taskWorkCenterId: "",
      duration: "",
      shifts: { morning: false, afternoon: false, evening: false },
      toBeCarriedOut: "during",
      periodicity: "once",
      taskStartDate: "",
      taskEndDate: "",
      interval: 1,
      onceDate: "",
      weeklyDays: [],
      monthlyDays: [],
      monthlyWeekdays: [],
      monthlyMode: "dates",
      monthlyFirstWeekday: null,
      monthlyLastWeekday: null,
      yearlyMonths: [],
      yearlyDays: [],
      alertTaskCompleted: false,
      pendingTaskAlert: false,
    }));
  };

  const removeTaskFromList = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragOverItemIndex.current = index;
    e.preventDefault();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragItemIndex.current;
    const to = dragOverItemIndex.current;
    if (from == null || to == null || from === to) return;

    setFormData((prev) => {
      const newTasks = [...prev.tasks];
      const [moved] = newTasks.splice(from, 1);
      newTasks.splice(to, 0, moved);
      return { ...prev, tasks: newTasks };
    });

    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleDragEnd = () => {
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  // Navigation functions
  const handleNext = useCallback(() => {
    setErrors({});

    if (currentMainStep === 1) {
      const newErrors: typeof errors = {};
      if (!formData.denomination || !formData.denomination.trim()) {
        newErrors.denomination = t("thisFieldIsRequired");
      }
      if (!formData.startDate) {
        newErrors.startDate = t("thisFieldIsRequired");
      }
      if (!formData.clientId) {
        newErrors.client = t("thisFieldIsRequired");
      }
      if (!formData.workCenterIds || formData.workCenterIds.length === 0) {
        newErrors.workCenters = t("thisFieldIsRequired");
      }
      if (!formData.workerIds || formData.workerIds.length === 0) {
        newErrors.workers = t("thisFieldIsRequired");
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const startIso = toISODate(formData.startDate);
      if (!startIso) {
        setErrors({ startDate: t("invalidDate") });
        return;
      }

      const startDateObj = new Date(startIso + "T00:00:00");

      // Only validate start date is not in the past when creating new job
      if (mode === "create") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDateObj < today) {
          setErrors({
            startDate:
              t("startDateCannotBeInPast") ||
              "Start date cannot be in the past",
          });
          return;
        }
      }

      if (formData.endDate) {
        const endIso = toISODate(formData.endDate);
        if (!endIso) {
          setErrors({ endDate: t("invalidDate") });
          return;
        }
        const endDateObj = new Date(endIso + "T00:00:00");
        if (isNaN(endDateObj.getTime())) {
          setErrors({ endDate: t("invalidDate") });
          return;
        }
        if (endDateObj < startDateObj) {
          setErrors({
            endDate:
              t("endDateMustBeEqualOrAfterStart") ||
              "End date must be equal or after Start date",
          });
          return;
        }
      }

      if (currentSigningStep === 3) {
        const sm = formData.signingMethods || {};
        const anySelected = Object.values(sm).some((device: any) =>
          Object.values(device || {}).some((v: any) => !!v)
        );
        if (!anySelected) {
          setErrors({ signingMethods: t("requiredSigningMethods") });
          return;
        }
      }

      if (currentSigningStep < 4) {
        setCurrentSigningStep(currentSigningStep + 1);
      } else {
        setCurrentMainStep(2);
        setCurrentSigningStep(1);
      }
    } else if (currentMainStep === 2) {
      const draftPresent =
        (formData.task || "").trim() !== "" ||
        formData.taskStartDate ||
        formData.taskEndDate ||
        (formData.periodicity && formData.periodicity !== "once");

      if (draftPresent) {
        if (formData.taskStartDate) {
          const s = toISODate(formData.taskStartDate);
          if (!s) {
            setErrors((prev) => ({ ...prev, taskStartDate: t("invalidDate") }));
            return;
          }
          if (formData.taskEndDate) {
            const e = toISODate(formData.taskEndDate);
            if (!e) {
              setErrors((prev) => ({ ...prev, taskEndDate: t("invalidDate") }));
              return;
            }
            const startObj = new Date(s + "T00:00:00");
            const endObj = new Date(e + "T00:00:00");
            if (endObj < startObj) {
              setErrors((prev) => ({
                ...prev,
                taskEndDate:
                  t("endDateMustBeEqualOrAfterStart") ||
                  "End date must be equal or after Start date",
              }));
              return;
            }
          }
        }
      }

      setCurrentMainStep(3);
    }
  }, [currentMainStep, currentSigningStep, formData, t]);

  const handlePrevious = useCallback(() => {
    if (currentMainStep === 1) {
      if (currentSigningStep > 1) {
        setCurrentSigningStep(currentSigningStep - 1);
      }
    } else if (currentMainStep === 2) {
      setCurrentMainStep(1);
      setCurrentSigningStep(4);
    } else if (currentMainStep === 3) {
      setCurrentMainStep(2);
    }
  }, [currentMainStep, currentSigningStep]);

  const resetForm = useCallback(() => {
    setCurrentMainStep(1);
    setCurrentSigningStep(1);
    setEnableTasks(false);
    setEnableSurveys(false);
    setFormData(createInitialFormData());
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDate = formData.endDate || "2126-08-01";

      // Build seasonalSchedules from frontend schedules structure
      const seasonalSchedules: any[] = [];

      if (formData.scheduleType === "programming") {
        // Helper to collect all time events from a schedule
        const collectTimeEvents = (schedules: any) => {
          const events: any[] = [];
          DAY_KEYS.forEach((dayKey, idx) => {
            const ds = schedules[dayKey];
            if (!ds) return;
            ["morning", "afternoon", "evening"].forEach((sk) => {
              const slot = ds[sk as ShiftKey];
              if (slot?.start) {
                const m = timeToMinutes(slot.start);
                if (m >= 0) {
                  events.push({
                    kind: "start",
                    dayIndex: idx,
                    shift: sk,
                    minutes: m,
                  });
                }
              }
              if (slot?.end) {
                const m = timeToMinutes(slot.end);
                if (m >= 0) {
                  events.push({
                    kind: "end",
                    dayIndex: idx,
                    shift: sk,
                    minutes: m,
                  });
                }
              }
            });
          });
          events.sort(
            (a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes
          );
          return events;
        };

        const buildShiftBlocks = (schedules: any) => {
          const events = collectTimeEvents(schedules);
          const starts = events.filter((e) => e.kind === "start");
          const ends = events.filter((e) => e.kind === "end");

          starts.sort(
            (a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes
          );
          ends.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes);

          const assignedEnds = new Set<number>();
          const blocks: any[] = [];

          for (const sEv of starts) {
            let chosen: {
              end: any;
              endIndex: number;
              adjustedDayIndex: number;
            } | null = null;
            for (let i = 0; i < ends.length; i++) {
              if (assignedEnds.has(i)) continue;
              const eEv = ends[i];

              let adjustedDayIndex =
                eEv.dayIndex >= sEv.dayIndex ? eEv.dayIndex : eEv.dayIndex + 7;
              if (
                adjustedDayIndex === sEv.dayIndex &&
                eEv.minutes <= sEv.minutes
              )
                continue;

              const dayGap = adjustedDayIndex - sEv.dayIndex;
              if (dayGap < 0 || dayGap > 6) continue;

              if (
                !chosen ||
                adjustedDayIndex < chosen.adjustedDayIndex ||
                (adjustedDayIndex === chosen.adjustedDayIndex &&
                  eEv.minutes < chosen.end.minutes)
              ) {
                chosen = { end: eEv, endIndex: i, adjustedDayIndex };
              }
            }

            if (chosen) {
              const startAbs = sEv.dayIndex * 24 * 60 + sEv.minutes;
              const endAbs =
                chosen.adjustedDayIndex * 24 * 60 + chosen.end.minutes;
              if (endAbs > startAbs) {
                const startWeekday = DAY_KEYS[sEv.dayIndex];
                const endWeekday = DAY_KEYS[chosen.adjustedDayIndex % 7];
                const baseStartTime = minutesToTime(sEv.minutes);
                const baseEndTime = minutesToTime(chosen.end.minutes);
                const isContinuous =
                  sEv.dayIndex % 7 !== chosen.adjustedDayIndex % 7;
                const totalHours = Math.floor((endAbs - startAbs) / 60);
                blocks.push({
                  startWeekday,
                  endWeekday,
                  baseStartTime,
                  baseEndTime,
                  isContinuous,
                  totalHours,
                });
                assignedEnds.add(chosen.endIndex);
              }
            }
          }

          return blocks;
        };

        // Always create both normal and summer season objects (even if empty)
        console.log(
          "🔍 DEBUG - formData.seasonPeriods:",
          JSON.stringify(formData.seasonPeriods, null, 2)
        );
        (["normal", "summer"] as const).forEach((season) => {
          const seasonSchedules = formData.schedules[season];
          const blocks = buildShiftBlocks(seasonSchedules);

          const seasonObj: any = { season, shifts: blocks };

          // Find optional season period (start/end) provided by the user
          const seasonPeriod = (
            Array.isArray(formData.seasonPeriods) ? formData.seasonPeriods : []
          ).find((p: any) => p && p.season === season);
          console.log(
            `🔍 DEBUG - ${season} seasonPeriod:`,
            JSON.stringify(seasonPeriod, null, 2)
          );

          if (seasonPeriod) {
            // Only keep day-month (DD-MM). Accept inputs like DD/MM, MM/DD, YYYY-MM-DD
            const normalizeDayMonth = (val: any): string | null => {
              if (!val) return null;
              let s = String(val).trim();
              // If full ISO date, extract DD-MM
              const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
              if (iso) {
                return `${iso[3]}-${iso[2]}`;
              }
              // If DD/MM or DD-MM or MM/DD or MM-DD attempt to detect ordering
              const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
              if (dm) {
                let a = Number(dm[1]);
                let b = Number(dm[2]);
                // Heuristic: if first part > 12 then it's DD-MM
                let day: number;
                let month: number;
                if (a > 12 && b <= 12) {
                  day = a;
                  month = b;
                } else if (b > 12 && a <= 12) {
                  day = b;
                  month = a;
                } else {
                  // fallback assume first is day
                  day = a;
                  month = b;
                }
                if (day < 1 || day > 31 || month < 1 || month > 12) return null;
                return `${String(day).padStart(2, "0")}-${String(
                  month
                ).padStart(2, "0")}`;
              }
              return null;
            };
            const s = normalizeDayMonth(seasonPeriod.startDate);
            const e = normalizeDayMonth(seasonPeriod.endDate);
            console.log(`🔍 DEBUG - ${season} normalized dates:`, { s, e });
            if (s) seasonObj.startDate = s;
            if (e) seasonObj.endDate = e;
          }

          console.log(
            `🔍 DEBUG - ${season} seasonObj:`,
            JSON.stringify(seasonObj, null, 2)
          );
          seasonalSchedules.push(seasonObj);
        });
      }

      // Build signing methods array
      const signingMethods: any[] = [];
      const mapDetailKey = (key: string) => {
        const k = String(key).toLowerCase();
        if (k === "wifi" || k === "web") return "web";
        if (k === "ip") return "ip";
        if (k === "gps") return "gps";
        if (k === "qrcode" || k === "qr") return "qrcode";
        return k;
      };

      if (formData.signingMethods.mobile) {
        const mobileDetails = Object.entries(formData.signingMethods.mobile)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => mapDetailKey(key));
        if (mobileDetails.length > 0) {
          signingMethods.push({
            methodType: "mobile",
            methodDetails: mobileDetails,
            verifyIdentity: !!formData.verifyIdentity,
          });
        }
      }

      if (formData.signingMethods.laptop) {
        const laptopDetails = Object.entries(formData.signingMethods.laptop)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => mapDetailKey(key));
        if (laptopDetails.length > 0) {
          signingMethods.push({
            methodType: "pc",
            methodDetails: laptopDetails,
            verifyIdentity: false,
          });
        }
      }

      // Build alerts array
      const alerts: any[] = [];
      if (formData.entrance.whenSigningIn) {
        alerts.push({
          alertType: "sign_in",
          triggerTime: formData.entrance.delay 
            ? String(Number.parseInt(formData.entrance.delayValue) || 10)
            : null,
          minDuration: null,
        });
      }
      if (formData.exit.whenSigningIn) {
        alerts.push({
          alertType: "sign_out",
          triggerTime: null,
          minDuration: formData.exit.duration 
            ? Number.parseInt(formData.exit.durationValue) || 30
            : null,
        });
      }

      // Build tasks array
      const tasks: any[] = [];
      if (enableTasks && formData.tasks.length > 0) {
        formData.tasks.forEach((task) => {
          const selectedShifts = Object.entries(task.shifts)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => key);

          tasks.push({
            name: task.task,
            note: task.observations,
            expectedDuration: task.duration || "00:00",
            shift: selectedShifts[0] || null,
            timing: task.toBeCarriedOut,
            periodicity: task.periodicity,
            workCenterId: task.workCenterId || null,
            startDate: task.startDate || null,
            endDate: task.endDate || null,
            interval: task.interval || 1,
            onceDate: task.onceDate || null,
            weeklyDays: task.weeklyDays || null,
            monthlyDays: task.monthlyDays || null,
            monthlyWeekdays: task.monthlyWeekdays || null,
            monthlyStartWeekday: task.monthlyFirstWeekday || null,
            monthlyEndWeekday: task.monthlyLastWeekday || null,
            yearlyMonths: task.yearlyMonths || null,
            yearlyDays: task.yearlyDays || null,
            alertTask: task.alertTaskCompleted || false,
            pendingTask: task.pendingTaskAlert || false,
          });
        });
      }

      // Build surveys
      const parseMonitoringValue = (val: any) => {
        let n = Array.isArray(val) ? Number(val[0]) || 1 : Number(val) || 1;
        return Math.max(1, Math.min(10, n));
      };

      let customerSurveyPayload: any = null;
      let workerSurveyPayload: any = null;

      if (enableSurveys) {
        if (formData.customerSurvey.questionText) {
          customerSurveyPayload = {
            questionText: formData.customerSurvey.questionText,
            greetingText:
              formData.customerSurvey.farewellText ||
              "Please fill after job completion.",
            rateDigit: parseMonitoringValue(
              formData.customerSurvey.monitoringValue
            ),
            textAlertTracking:
              formData.customerSurvey.textAlertTracking || null,
            periodicity: formData.customerSurvey.periodicity,
            interval: Number(formData.customerSurvey.interval) || 1,
            sendTime: formData.customerSurvey.hour || null,
            weeklyDays: formData.customerSurvey.weeklyDays || [],
            monthlyWeekdays: formData.customerSurvey.monthlyWeekdays || [],
            monthlyDays: formData.customerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.customerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.customerSurvey.monthlyLastWeekday,
          };
        }

        if (formData.workerSurvey.questionText) {
          workerSurveyPayload = {
            questionText: formData.workerSurvey.questionText,
            greetingText:
              formData.workerSurvey.farewellText ||
              "Please fill after job completion.",
            rateDigit: parseMonitoringValue(
              formData.workerSurvey.monitoringValue
            ),
            textAlertTracking: formData.workerSurvey.textAlertTracking || null,
            periodicity: formData.workerSurvey.periodicity,
            interval: Number(formData.workerSurvey.interval) || 1,
            sendTime: formData.workerSurvey.hour || null,
            weeklyDays: formData.workerSurvey.weeklyDays || [],
            monthlyWeekdays: formData.workerSurvey.monthlyWeekdays || [],
            monthlyDays: formData.workerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.workerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.workerSurvey.monthlyLastWeekday,
          };
        }
      }

      const payload: any = {
        jobName: formData.denomination,
        startDate: formData.startDate,
        endDate,
        clientId: Number.parseInt(formData.clientId),
        workCenterIds: formData.workCenterIds
          ? formData.workCenterIds.map((id) => Number.parseInt(id))
          : [],
        workerIds: formData.workerIds.map((id) => Number.parseInt(id)),
        note: formData.observations,
        scheduleType:
          formData.scheduleType === "programming" ? "seasonal" : "free",
        seasonalSchedules:
          formData.scheduleType === "programming" ? seasonalSchedules : [],
        signingMethods,
        alerts,
        tasks,
      };

      console.log("🚀 FINAL PAYLOAD:", JSON.stringify(payload, null, 2));

      if (customerSurveyPayload) payload.customerSurvey = customerSurveyPayload;
      if (workerSurveyPayload) payload.workerSurvey = workerSurveyPayload;

      const endpoint =
        mode === "create"
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs`
          : `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${mode} job`);
      }

      const result = await response.json();

      toast({
        title:
          mode === "create"
            ? t("jobCreatedSuccessfully") || "Job created successfully!"
            : t("jobUpdatedSuccessfully") || "Job updated successfully!",
        variant: "default",
      });

      onComplete(result.data || result);

      if (mode === "create") {
        resetForm();
      }
    } catch (error: any) {
      console.error(`Error ${mode}ing job:`, error);
      toast({
        title: error.message || t("errorCreatingJob") || `Error ${mode}ing job`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    formData,
    enableTasks,
    enableSurveys,
    session,
    t,
    mode,
    jobId,
    onComplete,
    resetForm,
  ]);

  const handleDelete = useCallback(async () => {
    if (!jobId) return;

    const confirmDelete = window.confirm(
      t("confirmDeleteJob") || "Are you sure you want to delete this job? This action cannot be undone."
    );

    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete job");
      }

      toast({
        title: t("jobDeletedSuccessfully") || "Job deleted successfully!",
        variant: "default",
      });

      // Navigate back to dashboard or jobs list
      onComplete(null);
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: error.message || t("errorDeletingJob") || "Error deleting job",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [jobId, session, t, onComplete]);

  // Effects
  useEffect(() => {
    if (!session?.accessToken) return;
    fetchClients();
    fetchWorkers();
  }, [fetchClients, fetchWorkers, session?.accessToken]);

  useEffect(() => {
    fetchWorkCenters();
  }, [fetchWorkCenters]);

  useEffect(() => {
    if (formData.scheduleType === "programming") {
      const currentSeasonSchedules = formData.schedules[formData.currentSeason];
      const { weeklyTotal, pairingRegistry } = computeMultiDayTotals(
        currentSeasonSchedules,
        pairingRegistryRef.current
      );
      pairingRegistryRef.current = pairingRegistry;
      setFormData((prev) => ({ ...prev, totalWeeklyHours: weeklyTotal }));
    } else {
      setFormData((prev) => ({ ...prev, totalWeeklyHours: "00:00" }));
    }
  }, [formData.currentSeason, formData.schedules, formData.scheduleType]);

  // Render functions
  const renderProgressSteps = () => (
    <div className="flex items-center justify-center mt-6 mb-4">
      {mainSteps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.number <= currentMainStep
                  ? "text-white"
                  : "bg-muted text-muted-foreground"
              }`}
              style={
                step.number <= currentMainStep
                  ? { backgroundColor: "#662D91" }
                  : {}
              }
            >
              {step.number}
            </div>
            <span
              className={`text-xs mt-1 ${
                step.number === currentMainStep
                  ? "font-medium"
                  : "text-muted-foreground"
              }`}
              style={
                step.number === currentMainStep
                  ? { color: "#662D91" }
                  : undefined
              }
            >
              {step.label}
            </span>
          </div>
          {index < mainSteps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-2 ${
                step.number < currentMainStep ? "" : "bg-muted"
              }`}
              style={
                step.number < currentMainStep
                  ? { backgroundColor: "#662D91" }
                  : undefined
              }
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderSigningSubSteps = () =>
    currentMainStep === 1 && (
      <div className="flex items-center justify-center mt-4">
        {signingSteps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full ${
                step.number <= currentSigningStep ? "" : "bg-muted"
              }`}
              style={
                step.number <= currentSigningStep
                  ? { backgroundColor: "#662D91" }
                  : undefined
              }
            />
            {index < signingSteps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  step.number < currentSigningStep ? "" : "bg-muted"
                }`}
                style={
                  step.number < currentSigningStep
                    ? { backgroundColor: "#662D91" }
                    : undefined
                }
              />
            )}
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      {renderProgressSteps()}
      {renderSigningSubSteps()}

      <div className="min-h-[400px]">
        {currentMainStep === 1 && (
          <>
            {currentSigningStep === 1 && (
              <DefinitionForm
                formData={formData}
                updateFormData={updateFormData}
                clients={clients}
                workCenters={workCenters}
                workers={workers}
                loadingClients={loadingClients}
                loadingWorkCenters={loadingWorkCenters}
                loadingWorkers={loadingWorkers}
                errors={errors}
                toggleWorkCenterSelection={toggleWorkCenterSelection}
                toggleWorkerSelection={toggleWorkerSelection}
                workCenterTooltipOpen={workCenterTooltipOpen}
                setWorkCenterTooltipOpen={setWorkCenterTooltipOpen}
                workersTooltipOpen={workersTooltipOpen}
                setWorkersTooltipOpen={setWorkersTooltipOpen}
                workCenterQuery={workCenterQuery}
                setWorkCenterQuery={setWorkCenterQuery}
                workerQuery={workerQuery}
                setWorkerQuery={setWorkerQuery}
              />
            )}
            {currentSigningStep === 2 && (
              <SchedulesForm
                formData={formData}
                updateFormData={updateFormData}
                updateScheduleTime={updateScheduleTime}
                tempValues={tempValues}
                setTempValues={setTempValues}
                seasonTooltipOpen={seasonTooltipOpen}
                setSeasonTooltipOpen={setSeasonTooltipOpen}
                pairingRegistryRef={pairingRegistryRef}
                daysOfWeek={daysOfWeek}
                clearCurrentSeasonSchedules={clearCurrentSeasonSchedules}
                commitValue={(key: string, value: string) => {
                  // Parse the key: format is "day-shift-timeType" e.g. "monday-morning-start"
                  const parts = key.split("-");
                  if (parts.length === 3) {
                    const day = parts[0];
                    const shift = parts[1] as ShiftKey;
                    const timeType = parts[2] as "start" | "end";
                    
                    // Validate and update the schedule time
                    if (value && value !== "--:--") {
                      updateScheduleTime(day, shift, timeType, value);
                    }
                  }
                  
                  // Clear the temporary value
                  setTempValues((prev) => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                  });
                }}
              />
            )}
            {currentSigningStep === 3 && (
              <SigningMethodsForm
                formData={formData}
                updateFormData={updateFormData}
                errors={errors}
                updateSigningMethod={updateSigningMethod}
              />
            )}
            {currentSigningStep === 4 && (
              <AlertsForm
                formData={formData}
                updateNestedFormData={updateNestedFormData}
                delayTooltipOpen={delayTooltipOpen}
                setDelayTooltipOpen={setDelayTooltipOpen}
                durationTooltipOpen={durationTooltipOpen}
                setDurationTooltipOpen={setDurationTooltipOpen}
              />
            )}
          </>
        )}

        {currentMainStep === 2 && (
          <TasksForm
            enableTasks={enableTasks}
            setEnableTasks={setEnableTasks}
            formData={formData}
            updateFormData={updateFormData}
            workCenters={workCenters}
            errors={errors}
            setErrors={setErrors}
            onAddTask={addTaskToList}
            onRemoveTask={removeTaskFromList}
            onEditTask={editTask}
            onCancelEdit={cancelEditTask}
            editingTaskId={editingTaskId}
            dragItemIndex={dragItemIndex}
            dragOverItemIndex={dragOverItemIndex}
            handleDragStart={handleDragStart}
            handleDragEnter={handleDragEnter}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            handleDragEnd={handleDragEnd}
          />
        )}

        {currentMainStep === 3 && (
          <SurveysForm
            enableSurveys={enableSurveys}
            setEnableSurveys={setEnableSurveys}
            formData={formData}
            updateNestedFormData={updateNestedFormData}
          />
        )}
      </div>

      <div className="flex items-center p-2 px-6 justify-between">
        <div className="flex gap-2">
          {mode === "edit" && currentMainStep === 1 && currentSigningStep === 1 && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("delete") || "Delete"}
            </Button>
          )}

          {onCancel && currentMainStep === 1 && currentSigningStep === 1 && (
            <Button variant="outline" onClick={onCancel}>
              {t("cancel") || "Cancel"}
            </Button>
          )}

          {!(currentMainStep === 1 && currentSigningStep === 1) && (
            <button
              className="bg-[#7d7d7d] text-white font-normal p-2 rounded-lg"
              onClick={handlePrevious}
              disabled={currentMainStep === 1 && currentSigningStep === 1}
            >
              {t("previous") || "Previous"}
            </button>
          )}
        </div>

        {currentMainStep === 1 &&
          currentSigningStep === 2 &&
          (formData.scheduleType as string) === "programming" && (
            <Button
              variant="destructive"
              onClick={clearCurrentSeasonSchedules}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6"
            >
              {t("clearSchedules") || "Borrar"}
            </Button>
          )}

        <div className="flex items-center gap-3">
          {currentMainStep === 3 ? (
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading
                ? mode === "create"
                  ? t("creating") || "Creating..."
                  : t("updating") || "Updating..."
                : mode === "create"
                ? t("create") || "Create"
                : t("update") || "Update"}
            </Button>
          ) : (
            <Button onClick={handleNext}>{t("next") || "Next"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
