"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import {
  Calendar,
  CheckCircle,
  Target,
  MapPin,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import JobCard from "./job-card"
import SelfieCapture from "./selfie-capture"
import GpsConsentDialog from "./gps-consent-dialog"
import LocationHelpDialog, { LocationHelpChoice } from "./location-help-dialog"
import SurveyFillDialog from "@/components/surveys/survey-fill-dialog"
import { surveyStatus, SurveyEntry } from "@/lib/survey-client"
import PrivacyDialog from "./privacy-section"
import { webauthnStatus, authenticateDevice, registerDevice, webauthnSupported } from "@/lib/webauthn-client"
import { locationConsentStatus, grantLocationConsent } from "@/lib/consent-client"
import { CurrentJobCard } from "./current-job-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { JobFilterBar, jobMatchesFilters, jobWorkCenters, jobClients, jobOccupations, StatCard, AttentionCard, ActionButton, SectionLabel, ListPanel, ListRow, RowAvatar, StatusChip } from "../dashboard-widgets"
import { useRouter } from "next/navigation"
import { Clock, Briefcase, ClipboardCheck, Coins, FileText, Fingerprint } from "lucide-react"
import { CheckInMethods } from "@/components/dashboards/worker-dashboard/check-in-methods"
import { CheckInProcess } from "@/components/dashboards/worker-dashboard/check-in-process"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import ManualAttendanceRequestForm from "@/components/manual-attendance/manual-attendance-request-form"
import { madridYmd, DEFAULT_TIMEZONE, formatLocalDate } from "@/lib/datetime"

// Backend error parsing/translation lives in `lib/backend-error.ts` and is consumed
// inside the component via `useBackendError()`. The previous local `parseBackendError`
// helper has been removed to avoid duplicating that logic.

// Updated interfaces
interface TaskHistory {
  id: number;
  taskId: number;
  date: string;
  isCompleted: boolean;
  completedAt?: string;
  completedByWorkerId?: number;
}

interface ApiWorkerJob {
  jobId: number;
  publicId?: string;
  jobName: string;
  jobStatus?: string;
  clientName?: string;
  workCenters?: Array<{ id?: number; publicId?: string; name?: string }>;
  workCenterNames?: string;
  scheduleType?: string;
  totalShifts?: number;
  expectedDuration?: number;
  activeScheduleWeekHours?: number | null;
  startDate?: string;
  endDate?: string;
  tasks?: Array<{
    id: number;
    name: string;
    note?: string;
    expectedDuration?: number;
    isCompleted?: boolean;
    taskHistories?: TaskHistory[];
  }>;
  signingMethods?: Array<{
    methodType?: string;
    methodDetails?: string[];
    verifyIdentity?: boolean;
  }>;
  hasClientSurvey?: boolean;
  hasWorkerSurvey?: boolean;
  workers?: Array<{ id: number; code?: string; name?: string | null }>;
}

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
  startDate: Date;
  endDate: Date;
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
  hasAttendanceRecord: boolean;
  survey?: {
    rating: number;
    comments: string;
    submitted: boolean;
    submittedAt?: Date;
  };
}

interface WorkerStats {
  todayShifts: number;
  completedJobs: number;
  totalHours: number;
  onTimeRate: number;
  taskCompletionRate: number;
}

interface LocationData {
  isAtWorkCenter: boolean;
  distance: number;
  accuracy: number;
  wifiConnected: boolean;
  wifiName?: string;
  city?: string;
  country?: string;
}

interface ApiWorkerResponse {
  message: string;
  data: ApiWorkerJob[];
  isSuccess: boolean;
  statusCode: number;
  developerError: string;
}

export default function WorkerDashboardMain() {
  const { t } = useTranslation("worker-dashboard");
  const { t: tg, language } = useTranslation();
  const { t: tf } = useTranslation("fichaje-cards");
  const router = useRouter();
  const translateBackendError = useBackendError();
  const { session, logout, isAuthenticated } = useAuth();

  const [todayAssignments, setTodayAssignments] = useState<JobAssignment[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatus, setJobStatus] = useState("all");
  const [jobWorkCenter, setJobWorkCenter] = useState("all");
  const [jobClient, setJobClient] = useState("all");
  const [jobOcc, setJobOcc] = useState("all");
  const [jobsTab, setJobsTab] = useState<"today" | "all">("today");
  const [wd, setWd] = useState<any>({ hoursThisWeek: 0, missing: 0, payslips: [], todayIds: [] as string[] });

  // The four summary fetches are independent; each gets its own cache entry
  // and they are combined into `wd` below.
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  const mondayKey = (() => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    return monday.toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  })();

  const { data: pendingArr } = useQuery<any[]>({
    queryKey: ["jobs", "worker", "pending"],
    queryFn: async () => {
      const j = await apiFetch<any>("/jobs/worker/pending");
      return Array.isArray(j?.data) ? j.data : [];
    },
    enabled: isAuthenticated,
  });

  const { data: weekRecords } = useQuery<any[]>({
    queryKey: ["records", "worker", "week", mondayKey, todayKey],
    queryFn: async () => {
      const j = await apiFetch<any>(`/jobs/worker/work-session-records?start=${mondayKey}&end=${todayKey}`);
      return Array.isArray(j?.data) ? j.data : [];
    },
    enabled: isAuthenticated,
  });

  const { data: payslips } = useQuery<any[]>({
    queryKey: ["worker", "salaries"],
    queryFn: async () => {
      const j = await apiFetch<any>("/worker/me/salaries");
      return (Array.isArray(j?.data) ? j.data : []).slice(0, 3);
    },
    enabled: isAuthenticated,
  });

  const { data: dayJobs } = useQuery<any[]>({
    queryKey: ["jobs", "worker", "day"],
    queryFn: async () => {
      const j = await apiFetch<any>("/jobs/worker/day");
      return Array.isArray(j?.data?.jobs) ? j.data.jobs : Array.isArray(j?.data) ? j.data : [];
    },
    enabled: isAuthenticated,
  });

  // Depend on the query results themselves — react-query keeps a stable
  // reference per fetch. Defaulting to `[]` here instead would allocate a new
  // array every render and spin this effect forever.
  useEffect(() => {
    const mins = (weekRecords ?? []).reduce(
      (s: number, r: any) => s + (Number(r.totalWorkMinutes ?? r.workedMinutes) || 0),
      0,
    );
    const dj = dayJobs ?? [];
    setWd({
      missing: (pendingArr ?? []).filter((x: any) => x.date === todayKey).length,
      hoursThisWeek: Math.round(mins / 60),
      payslips: payslips ?? [],
      todayIds: dj.map((x: any) => x.publicId).filter(Boolean),
      liveIds: dj
        .filter((x: any) => x.session?.checkInTime && !x.session?.checkOutTime)
        .map((x: any) => x.publicId)
        .filter(Boolean),
    });
  }, [pendingArr, weekRecords, payslips, dayJobs, todayKey]);
  const [currentJob, setCurrentJob] = useState<JobAssignment | null>(null);
  const [workerStats, setWorkerStats] = useState<WorkerStats>({
    todayShifts: 0,
    completedJobs: 0,
    totalHours: 0,
    onTimeRate: 95,
    taskCompletionRate: 0,
  });
  const [locationData, setLocationData] = useState<LocationData>({
    isAtWorkCenter: false,
    distance: 0,
    accuracy: 0,
    wifiConnected: false,
    city: "San Francisco",
    country: "United States",
  });
  const [loading, setLoading] = useState(true);
  // removed tab menu - show assignments directly
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Day-key anchored to Europe/Madrid regardless of viewer timezone
  const dateKeyInTz = (date: string | Date) => madridYmd(date);

  // Check-in flow states
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedJob, setSelectedJob] = useState<JobAssignment | null>(null);
  const [selectedCheckInMethod, setSelectedCheckInMethod] = useState("");
  // When a QR is scanned in the SignInMethodDialog, store it here and
  // route to CheckInProcess which will collect GPS → IP → then process the token
  const [preScannedQrToken, setPreScannedQrToken] = useState<string | undefined>(undefined);
  // Set when a worker tries to start a job while another session is still open.
  const [blockingJob, setBlockingJob] = useState<JobAssignment | null>(null);

  // Survey states

  // Job detail view state
  const [detailJob, setDetailJob] = useState<JobAssignment | null>(null);

  // Manual attendance state
  const [manualAttendanceJob, setManualAttendanceJob] = useState<any>(null);
  const [showManualAttendanceForm, setShowManualAttendanceForm] = useState(false);
  
const transformApiJobToJobAssignment = (apiJob: ApiWorkerJob): JobAssignment => {
  // Log the API job data to debug work session
  if (apiJob.workSession) {
    console.log(`📋 Job ${apiJob.jobId} has workSession:`, {
      checkInTime: apiJob.workSession.checkInTime,
      checkOutTime: apiJob.workSession.checkOutTime,
      isActive: apiJob.workSession.isActive
    });
  }
  
  const currentDate = new Date();
  const today = dateKeyInTz(currentDate); // YYYY-MM-DD in Europe/Madrid

  // Parse start and end dates
  let startDate = new Date();
  let endDate = new Date();

  if (apiJob.startDate) {
    startDate = new Date(apiJob.startDate);
  }
  if (apiJob.endDate) {
    endDate = new Date(apiJob.endDate);
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.ceil(apiJob.expectedDuration / 8));
  }

  // Determine job status
  let status: "scheduled" | "in_progress" | "completed";
  const hasAttendanceRecord =
    Boolean(
      apiJob.attendanceRecords &&
        apiJob.attendanceRecords.length > 0 &&
        apiJob.attendanceRecords.some(
          (record) => record.checkInTime && record.checkOutTime,
        ),
    ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime);

  // Check if there's an active work session (checked in but not checked out)
  const hasActiveSession = Boolean(
    apiJob.workSession?.checkInTime && 
    !apiJob.workSession?.checkOutTime &&
    apiJob.workSession?.isActive
  );

  // An active session (checked in, not out) always means in progress — even for free jobs
  // whose computed endDate is in the past.
  if (hasActiveSession) {
    status = "in_progress";
  } else if (currentDate > endDate) {
    status = hasAttendanceRecord ? "completed" : "scheduled";
  } else {
    status = hasAttendanceRecord || apiJob.workSession?.checkInTime ? "in_progress" : "scheduled";
  }

  // Get shift info — backend now returns scheduleType/totalShifts/activeScheduleWeekHours
  const firstWorkCenterName = (apiJob.workCenters && apiJob.workCenters.length > 0)
    ? apiJob.workCenters[0].name || apiJob.workCenterNames?.split(',')[0] || 'Work Center'
    : (apiJob.workCenterNames ? apiJob.workCenterNames.split(',')[0] : 'Work Center');

  const shiftInfo = {
    type: 'morning' as const,
    startTime: undefined as any,
    endTime: undefined as any,
    duration: apiJob.activeScheduleWeekHours ? `${apiJob.activeScheduleWeekHours} h/sem` : `${apiJob.expectedDuration || 0} h`,
    scheduleType: (apiJob.scheduleType as any) || 'flexible',
  };

  // Transform signing methods
  // signingMethods: backend returns array; pick first entry safely
  // signingMethods: backend returns an array of methods (each with methodType and methodDetails[])
  // Aggregate all methodDetails across mobile and pc entries so the UI can render badges for each available method.
  const allSigning = Array.isArray(apiJob.signingMethods) ? apiJob.signingMethods : [];
  // normalize raw detail strings to canonical keys used by JobCard: qrcode, gps, ip, web
  const normalizeDetail = (d: any) => {
    const s = String(d || '').toLowerCase();
    if (s.includes('qr')) return 'qrcode';
    if (s.includes('gps')) return 'gps';
    if (s.includes('ip')) return 'ip';
    if (s.includes('web') || s.includes('wifi')) return 'web';
    return s;
  };

  const mobileDetails = allSigning
    .filter((m: any) => String(m?.methodType || '').toLowerCase().includes('mobile'))
    .flatMap((m: any) => (Array.isArray(m.methodDetails) ? m.methodDetails : [m.methodDetails]))
    .map(normalizeDetail)
    .filter(Boolean);

  const pcDetails = allSigning
    .filter((m: any) => {
      const t = String(m?.methodType || '').toLowerCase();
      return t.includes('pc') || t.includes('laptop') || t.includes('web');
    })
    .flatMap((m: any) => (Array.isArray(m.methodDetails) ? m.methodDetails : [m.methodDetails]))
    .map(normalizeDetail)
    .filter(Boolean);

  // expose arrays that the JobCard component understands (signingMobile / signingPc)
  const signingMobileArray = Array.from(new Set(mobileDetails));
  const signingPcArray = Array.from(new Set(pcDetails));

  // ✅ Enhanced task transformation with TaskHistory support
  const tasks = (apiJob.tasks || []).map((task) => {
    // Find TaskHistory for today with better null checking
    const todayHistory = task.taskHistories?.find((history) => {
      if (!history || !history.date) return false;
      const historyDate = dateKeyInTz(history.date);
      return historyDate === today;
    });

    return {
      id: task.id,
      name: task.name,
      description: task.note || `Complete ${task.name.toLowerCase()}`,
      // Use TaskHistory completion status if available, otherwise fallback to task completion
      completed: todayHistory
        ? todayHistory.isCompleted
        : (task.isCompleted || false),
      duration: task.expectedDuration ? `${task.expectedDuration} min` : "30 min",
      timing: "during" as const,
      // Store TaskHistory reference for future use
      taskHistory: todayHistory
        ? {
            id: todayHistory.id,
            date: todayHistory.date,
            isCompleted: todayHistory.isCompleted,
            completedAt: todayHistory.completedAt,
            completedByWorkerId: todayHistory.completedByWorkerId,
          }
        : null,
    };
  });

  return {
    id: apiJob.jobId,
    publicId: apiJob.publicId,
    jobId: `JOB-${apiJob.jobId.toString().padStart(4, "0")}`,
    title: apiJob.jobName,
    verifyIdentity: allSigning.some((m: any) => m?.verifyIdentity === true),
    client: {
      id: apiJob.clientId || 0,
      name: apiJob.clientName,
    },
    workCenter: {
      id: (apiJob.workCenters && apiJob.workCenters[0] && apiJob.workCenters[0].id) || 0,
      name: firstWorkCenterName,
      // The list endpoint does not carry the work center's address, and inventing
      // one ("<name> Address") put fabricated text into attendance records.
      address: "",
      coordinates: { lat: 37.4419, lng: -122.143 },
    },
    shift: shiftInfo,
    status,
    startDate,
    endDate,
  // Provide arrays the JobCard expects so badges render correctly
  signingMobile: signingMobileArray,
  signingPc: signingPcArray,
    tasks,
    checkInTime: apiJob.workSession?.checkInTime
      ? new Date(apiJob.workSession.checkInTime)
      : undefined,
    checkOutTime: apiJob.workSession?.checkOutTime
      ? new Date(apiJob.workSession.checkOutTime)
      : undefined,
    breakTime: apiJob.workSession?.totalBreakMinutes || 0,
    workedTime: apiJob.workSession?.totalWorkMinutes || 0,
  expectedHours: apiJob.activeScheduleWeekHours ?? apiJob.expectedDuration ?? 0,
    totalHours:
      status === "completed"
        ? apiJob.activeScheduleWeekHours ?? apiJob.expectedDuration
        : undefined,
    totalBreakTime: apiJob.workSession?.totalBreakMinutes || 0,
    isOnBreak: apiJob.workSession?.isOnBreak || false,
    breakStartTime: apiJob.workSession?.currentBreakStart
      ? new Date(apiJob.workSession.currentBreakStart)
      : undefined,
  tags: (apiJob.tasks || []).slice(0, 2).map((task) => task.name),
    hasAttendanceRecord,
    survey:
      status === "completed"
        ? {
            rating: 4,
            comments: "Job completed successfully",
            submitted: false,
            submittedAt: status === "completed" ? new Date() : undefined,
          }
        : undefined,
    // include raw workers if provided by backend
    workers: (apiJob.workers || []).map(w => ({ id: w.id, code: w.code, name: w.name })) || [],
  };
};





  const fetchWorkerJobs = async () => {
    if (!session?.accessToken) {
      setError("No authentication token available");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/worker/all-jobs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiWorkerResponse = await response.json();

      if (data.isSuccess && data.data) {
        const transformedJobs = data.data.map(transformApiJobToJobAssignment);
        setTodayAssignments(transformedJobs);

        // Set current job — an active check-in (not yet checked out) is definitive on its own;
        // don't gate on endDate (free jobs compute an endDate in the past).
        let newCurrentJob = transformedJobs.find(
          (job) => job.status === "in_progress" && job.checkInTime && !job.checkOutTime,
        );

        console.log("🔍 Looking for current job:", {
          foundJob: newCurrentJob?.id,
          foundJobTitle: newCurrentJob?.title,
          allJobs: transformedJobs.map(j => ({
            id: j.id,
            title: j.title,
            status: j.status,
            checkInTime: j.checkInTime?.toISOString(),
            checkOutTime: j.checkOutTime?.toISOString(),
            endDate: j.endDate?.toISOString(),
            hasCheckIn: !!j.checkInTime,
            hasCheckOut: !!j.checkOutTime
          }))
        });

        if (!newCurrentJob && currentJob) {
          const existingCurrentJob = transformedJobs.find((job) => job.id === currentJob.id);
          if (
            existingCurrentJob &&
            existingCurrentJob.status === "in_progress" &&
            existingCurrentJob.checkInTime &&
            !existingCurrentJob.checkOutTime
          ) {
            newCurrentJob = existingCurrentJob;
            console.log("Restored current job from previous state:", newCurrentJob.id);
          }
        }

        setCurrentJob(newCurrentJob || null);
        
        if (newCurrentJob) {
          console.log("✅ Current job set:", newCurrentJob.id, newCurrentJob.title);
        } else {
          console.log("ℹ️ No active current job found");
        }

        // Update stats
        const completedJobs = transformedJobs.filter((job) => job.status === "completed").length;
        const totalHours = transformedJobs
          .filter((job) => job.status === "completed")
          .reduce((sum, job) => sum + (job.totalHours || 0), 0);
        const totalTasks = transformedJobs.reduce((sum, job) => sum + job.tasks.length, 0);
        const completedTasks = transformedJobs.reduce(
          (sum, job) => sum + job.tasks.filter((task) => task.completed).length,
          0,
        );
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        setWorkerStats({
          todayShifts: transformedJobs.length,
          completedJobs,
          totalHours,
          onTimeRate: 95,
          taskCompletionRate,
        });
      } else {
        throw new Error(data.developerError || data.message || "Failed to fetch worker jobs");
      }
    } catch (error) {
      console.error("Error fetching worker jobs:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch worker jobs");
      setTodayAssignments([]);
    } finally {
      setLoading(false);
    }
  };





  useEffect(() => {
    fetchWorkerJobs();
  }, [session?.accessToken]);


  useEffect(() => {
    const checkLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocationData({
              isAtWorkCenter: true,
              distance: 15,
              accuracy: position.coords.accuracy,
              wifiConnected: true,
              wifiName: "TechSolutions_WiFi",
              city: "San Francisco",
              country: "United States",
            });
          },
          () => {
            setLocationData((prev) => ({
              ...prev,
              isAtWorkCenter: false,
              distance: 999,
              city: "San Francisco",
              country: "United States",
            }));
          },
        );
      }
    };

    checkLocation();
    const locationTimer = setInterval(checkLocation, 30000);
    return () => clearInterval(locationTimer);
  }, []);

  /**
   * Blocks a second check-in before the worker walks to the QR and scans it.
   * The server enforces this too, but only after the scan — refusing them at the
   * tap saves the trip. Returns true when the check-in may proceed.
   */
  const guardAgainstOpenSession = (job: JobAssignment): boolean => {
    const open = currentJob;
    if (!open || !open.checkInTime || open.checkOutTime) return true;

    const sameJob = (open.publicId && open.publicId === (job as any).publicId) || open.id === job.id;
    if (sameJob) {
      toast({
        title: tg("alreadyCheckedIn") || "Ya has fichado",
        description: tg("alreadyCheckedInHere") || "Ya tienes la entrada fichada en este trabajo.",
      });
      setCurrentView("dashboard");
      return false;
    }

    setBlockingJob(open);
    return false;
  };

  const handleCheckIn = (job: JobAssignment) => {
    if (!guardAgainstOpenSession(job)) return;
    setSelectedJob(job);
    setSelectedCheckInMethod("default"); // Set a default method if needed
    setCurrentView("checkInProcess"); // Go directly to check-in process
  };

  const handleCheckInMethodSelect = (method: string) => {
    setSelectedCheckInMethod(method);
    setCurrentView("checkInProcess");
  };

  // Handle check-in with specific signing method
  // Identity selfie modal (opened only when the job requires identity verification)
  const [selfieOpen, setSelfieOpen] = useState(false)
  const selfieResolveRef = useRef<((v: string | null) => void) | null>(null)
  const captureSelfie = () =>
    new Promise<string | null>((resolve) => {
      selfieResolveRef.current = resolve
      setSelfieOpen(true)
    })

  // GDPR location consent (Phase 3) — asked once before the first location capture, then persisted.
  const [gpsConsentOpen, setGpsConsentOpen] = useState(false)
  const [gpsConsentBusy, setGpsConsentBusy] = useState(false)
  const consentGrantedRef = useRef<boolean>(false)
  const consentResolveRef = useRef<((v: boolean) => void) | null>(null)
  const ensureLocationConsent = async (): Promise<boolean> => {
    if (consentGrantedRef.current) return true
    const token = session?.accessToken || ""
    const st = await locationConsentStatus(token)
    if (st.granted) {
      consentGrantedRef.current = true
      return true
    }
    const accepted = await new Promise<boolean>((resolve) => {
      consentResolveRef.current = resolve
      setGpsConsentOpen(true)
    })
    return accepted
  }
  const handleConsentAccept = async () => {
    setGpsConsentBusy(true)
    const res = await grantLocationConsent(session?.accessToken || "")
    setGpsConsentBusy(false)
    setGpsConsentOpen(false)
    consentGrantedRef.current = !!res.granted
    consentResolveRef.current?.(!!res.granted)
    consentResolveRef.current = null
  }
  const handleConsentDecline = () => {
    setGpsConsentOpen(false)
    consentResolveRef.current?.(false)
    consentResolveRef.current = null
  }

  // Location-blocked helper — offers retry / continue-without / cancel instead of a dead end.
  const [locHelpOpen, setLocHelpOpen] = useState(false)
  const [locHelpReason, setLocHelpReason] = useState<LocationError>("denied")
  const locHelpResolveRef = useRef<((c: LocationHelpChoice) => void) | null>(null)
  const openLocationHelp = (reason: LocationError) =>
    new Promise<LocationHelpChoice>((resolve) => {
      setLocHelpReason(reason)
      locHelpResolveRef.current = resolve
      setLocHelpOpen(true)
    })
  const handleLocHelpChoice = (choice: LocationHelpChoice) => {
    setLocHelpOpen(false)
    locHelpResolveRef.current?.(choice)
    locHelpResolveRef.current = null
  }

  // Device biometric (WebAuthn) enrollment status
  const [bioReg, setBioReg] = useState<boolean | null>(null)
  const [bioBusy, setBioBusy] = useState(false)
  useEffect(() => {
    if (!session?.accessToken || !webauthnSupported()) return
    webauthnStatus(session.accessToken).then((s) => setBioReg(s.registered)).catch(() => {})
  }, [session?.accessToken])
  const handleRegisterBio = async () => {
    if (!session?.accessToken) return
    setBioBusy(true)
    try {
      const r = await registerDevice(session.accessToken, typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 100) : "")
      if (r?.verified) {
        setBioReg(true)
        toast({ title: "Verificación biométrica activada" })
      } else {
        toast({ title: "No se pudo activar", description: r?.error || (r as any)?.message || "Error", variant: "destructive" })
      }
    } finally {
      setBioBusy(false)
    }
  }

  // Best-effort browser location (for web check-in record only — never blocks check-in)
  type LocationError = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout"
  const getBrowserLocation = (): Promise<{ latitude?: number; longitude?: number; error?: LocationError }> =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({ error: "unsupported" })
      // Geolocation only works in a secure context (https or localhost); on http+IP it fails silently.
      if (typeof window !== "undefined" && window.isSecureContext === false) return resolve({ error: "insecure" })
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => resolve({ error: err?.code === 1 ? "denied" : err?.code === 3 ? "timeout" : "unavailable" }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })

  const handleCheckInWithMethod = async (job: any, signingMethod: string, additionalData?: any) => {
    try {
      // Identity verification (optional) — only when the job requires it.
      let selfie: string | null = null
      if (job?.verifyIdentity) {
        selfie = await captureSelfie()
        // Device biometric (fingerprint / Face ID / PIN) — only if the worker enrolled a device.
        try {
          const st = await webauthnStatus(session?.accessToken || "")
          if (st.registered) {
            await authenticateDevice(session?.accessToken || "")
          }
        } catch {
          /* biometric is best-effort; check-in continues */
        }
      }

      setActionLoading(true);

      if (!session?.accessToken) {
        throw new Error("No access token found");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
      const response = await fetch(`${baseUrl}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.publicId || job.id,
          scanType: "check-in",
          signingMethod: signingMethod,
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...additionalData,
          ...(selfie ? { selfie } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let friendlyMsg = "Failed to check in";
        try { friendlyMsg = JSON.parse(errorText)?.message || friendlyMsg; } catch {}
        throw new Error(friendlyMsg);
      }

      const result = await response.json();
      console.log("✅ Check-in successful:", result);

      // Update job state to in_progress
      const updatedJob = {
        ...job,
        status: "in_progress" as const,
        checkInTime: new Date(),
        isOnBreak: false,
      };

      setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)));
      setCurrentJob(updatedJob);
      setCurrentView('currentJob');
      const _pub = (job as any).publicId;
      if (_pub) setWd((p: any) => ({ ...p, liveIds: Array.from(new Set([...(p.liveIds || []), _pub])) }));

    } catch (error) {
      console.error("Check-in error:", error);
      toast({ variant: "destructive", title: "Check-in Failed", description: translateBackendError(error, "Failed to check in") });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle check-in with IP method
  const handleCheckInWithIP = async (job: any) => {
    try {
      setActionLoading(true);
      
      // Fetch IP address
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();
      
      await handleCheckInWithMethod(job, 'ip', {
        ipAddress: ipData.ip,
      });
    } catch (error) {
      console.error("IP check-in error:", error);
      setError("Could not fetch IP address");
      setActionLoading(false);
    }
  };

  // Handle check-in with GPS method
  const handleCheckInWithGPS = async (job: any) => {
    try {
      // GDPR: explicit location consent before reading GPS.
      if (!(await ensureLocationConsent())) {
        toast({ variant: "destructive", title: tf("locNeeded"), description: tf("consentGps") });
        return;
      }
      setActionLoading(true);

      // Request GPS permission and get coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        });
      });

      await handleCheckInWithMethod(job, 'gps', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error: any) {
      console.error("GPS check-in error:", error);
      const msg = error instanceof Error ? error.message : String(error);

      // GPS-specific error messages
      if (error instanceof GeolocationPositionError || msg.includes('location')) {
        toast({ variant: "destructive", title: "Location Required", description: "Could not access your location. Please enable GPS and try again." });
      } else if (msg.includes('not in range')) {
        toast({ variant: "destructive", title: "Out of Range", description: msg });
      } else if (msg.includes('not activated')) {
        toast({ variant: "destructive", title: "GPS Not Activated", description: msg });
      } else if (msg.includes('not enabled for this job')) {
        toast({ variant: "destructive", title: "Method Not Allowed", description: msg });
      } else if (msg.includes('no work center has GPS activated')) {
        toast({ variant: "destructive", title: "GPS Not Available", description: msg });
      } else if (msg.includes('No shift is scheduled')) {
        toast({ variant: "destructive", title: "No Shift Today", description: msg });
      } else {
        toast({ variant: "destructive", title: "GPS Check-in Failed", description: translateBackendError(error, "Failed to check in with GPS") });
      }
      setActionLoading(false);
    }
  };

  // Handle check-in with QR code
  const handleCheckInWithQR = async (job: any, qrToken: string) => {
    await handleCheckInWithMethod(job, 'qrcode', {
      qrToken: qrToken,
    });
  };

  const handleCheckOut = async (job: JobAssignment) => {
    try {
      setActionLoading(true);

      if (!session?.accessToken) {
        throw new Error("No access token found");
      }

      let locationData = null;
      let userIP = "";

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });

        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const addressResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=16`,
          );
          if (addressResponse.ok) {
            const data = await addressResponse.json();
            locationData.address = data.display_name;
          }
        } catch (error) {
          console.error("Address fetch error:", error);
        }
      } catch (error) {
        console.error("Location error:", error);
      }

      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (error) {
        console.error("IP fetch error:", error);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.publicId || job.id,
          scanType: "check-out",
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: JSON.stringify({
            // Only a genuinely resolved address, never a stand-in.
            address: locationData?.address || null,
            ip: userIP,
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            qrData: null,
          }),
          // Canonical English, translated when displayed. Storing t() here baked
          // the writer's language into the record, so a note written on an
          // English phone stayed English for every Spanish reader afterwards.
          notes: "Work session completed",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const now = new Date();
        const updatedJob = {
          ...job,
          checkOutTime: now,
          hasAttendanceRecord: true,
        };

        setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)));
        setCurrentJob(null);
        const _pub = (job as any).publicId;
        if (_pub) setWd((p: any) => ({ ...p, liveIds: (p.liveIds || []).filter((id: string) => id !== _pub) }));
        await fetchWorkerJobs();
      } else {
        throw new Error(data.message || "Failed to check out");
      }
    } catch (error) {
      console.error("Error checking out:", error);
      toast({ variant: "destructive", title: "Check-out Failed", description: translateBackendError(error, "Failed to check out") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTakeBreak = async (job: JobAssignment, breakType: string) => {
    try {
      setActionLoading(true);

      if (!session?.accessToken) {
        throw new Error("No access token found");
      }

      let locationData = null;
      let userIP = "";

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4000,
            maximumAge: 0,
          });
        });

        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const addressResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=16`,
            { signal: controller.signal },
          );
          clearTimeout(timer);
          if (addressResponse.ok) {
            const data = await addressResponse.json();
            locationData.address = data.display_name;
          }
        } catch (error) {
          console.error("Address fetch error:", error);
        }
      } catch (error) {
        console.error("Location error:", error);
      }

      try {
        const ipController = new AbortController();
        const ipTimer = setTimeout(() => ipController.abort(), 4000);
        const ipResponse = await fetch("https://api.ipify.org?format=json", { signal: ipController.signal });
        clearTimeout(ipTimer);
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (error) {
        console.error("IP fetch error:", error);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.publicId || job.id,
          scanType: "break-start",
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: JSON.stringify({
            // Only a genuinely resolved address, never a stand-in.
            address: locationData?.address || null,
            ip: userIP,
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            qrData: null,
          }),
          notes: `Break started: ${breakType}`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const now = new Date();
        const updatedJob = {
          ...job,
          status: "in_progress" as const,
          isOnBreak: true,
          breakStartTime: now,
        };

        setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)));
        setCurrentJob(updatedJob);
      } else {
        throw new Error(data.message || "Failed to start break");
      }
    } catch (error) {
      console.error("Error starting break:", error);
      toast({ variant: "destructive", title: "Break Start Failed", description: translateBackendError(error, "Failed to start break") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackToWork = async (job: JobAssignment) => {
    try {
      setActionLoading(true);

      if (!session?.accessToken) {
        throw new Error("No access token found");
      }

      let locationData = null;
      let userIP = "";

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4000,
            maximumAge: 0,
          });
        });

        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const addressResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=16`,
            { signal: controller.signal },
          );
          clearTimeout(timer);
          if (addressResponse.ok) {
            const data = await addressResponse.json();
            locationData.address = data.display_name;
          }
        } catch (error) {
          console.error("Address fetch error:", error);
        }
      } catch (error) {
        console.error("Location error:", error);
      }

      try {
        const ipController = new AbortController();
        const ipTimer = setTimeout(() => ipController.abort(), 4000);
        const ipResponse = await fetch("https://api.ipify.org?format=json", { signal: ipController.signal });
        clearTimeout(ipTimer);
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (error) {
        console.error("IP fetch error:", error);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.publicId || job.id,
          scanType: "break-end",
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: JSON.stringify({
            // Only a genuinely resolved address, never a stand-in.
            address: locationData?.address || null,
            ip: userIP,
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            qrData: null,
          }),
          notes: "Break ended, back to work",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Fetch updated job data from backend to get correct totalBreakMinutes
        await fetchWorkerJobs();
      } else {
        throw new Error(data.message || "Failed to end break");
      }
    } catch (error) {
      console.error("Error ending break:", error);
      toast({ variant: "destructive", title: "Break End Failed", description: translateBackendError(error, "Failed to end break") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTaskToggle = async (jobId: string | number, taskId: string | number) => {
  try {
    setActionLoading(true);

    if (!session?.accessToken) {
      throw new Error("No access token found");
    }

    console.log(`Toggling task for jobId: ${jobId}, taskId: ${taskId}`);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}/tasks/${taskId}/toggle`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    if (response.ok) {
      const isCompleted = data?.isCompleted ?? !todayAssignments
        .find(job => job.id === jobId)?.tasks
        .find(task => task.id === taskId)?.completed;

      setTodayAssignments((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? {
                ...job,
                tasks: job.tasks.map((task) =>
                  task.id === taskId ? { ...task, completed: isCompleted } : task,
                ),
              }
            : job,
        ),
      );

      if (currentJob && currentJob.id === jobId) {
        setCurrentJob((prev) =>
          prev
            ? {
                ...prev,
                tasks: prev.tasks.map((task) =>
                  task.id === taskId ? { ...task, completed: isCompleted } : task,
                ),
              }
            : null,
        );
      }
    } else {
      throw new Error(data.message || "Failed to toggle task completion");
    }
  } catch (error) {
    console.error("Error toggling task:", error);
    setError(error instanceof Error ? error.message : "Failed to toggle task");
  } finally {
    setActionLoading(false);
  }
};

  // Survey status per job (worker survey), keyed by job publicId.
  const [surveyMap, setSurveyMap] = useState<Record<string, SurveyEntry | null>>({});
  const [surveyDialog, setSurveyDialog] = useState<{ entry: SurveyEntry; date?: string } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const loadSurveyStatus = async (job: JobAssignment) => {
    const pub = String((job as any).publicId || job.id);
    if (!session?.accessToken) return null;
    const st = await surveyStatus(session.accessToken, pub);
    const entry = st?.worker || null;
    setSurveyMap((m) => ({ ...m, [pub]: entry }));
    return entry;
  };

  const handleFillSurvey = async (job: JobAssignment) => {
    const pub = String((job as any).publicId || job.id);
    let entry = surveyMap[pub];
    if (entry === undefined) entry = await loadSurveyStatus(job);
    if (!entry) { toast({ title: tf("noSurvey"), description: tf("noSurveyDesc") }); return; }
    if (entry.filled) { toast({ title: tf("surveyDoneTitle"), description: tf("surveyDoneDesc") }); return; }
    setSurveyDialog({ entry }); // no date → backend uses Madrid today
  };

  const surveyStateFor = (job: JobAssignment): "pending" | "done" | null => {
    const pub = String((job as any).publicId || job.id);
    const entry = surveyMap[pub];
    if (!entry) return null;
    return entry.filled ? "done" : "pending";
  };

  // Load the worker-survey status for the running job so the card can show the survey button.
  useEffect(() => {
    if (!currentJob || !session?.accessToken) return;
    const pub = String((currentJob as any).publicId || currentJob.id);
    if (surveyMap[pub] !== undefined) return;
    loadSurveyStatus(currentJob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob, session?.accessToken]);

  const handleViewDetail = (job: JobAssignment) => {
    router.push(`/jobs/${(job as any).publicId || job.id}/detail`);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    });
  };

  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: DEFAULT_TIMEZONE,
    });
  };

  const getCurrentSessionTime = (job: JobAssignment) => {
    if (!job.checkInTime) return "00:00:00";

    const now = new Date();
    let totalWorkingSeconds = 0;

    if (job.isOnBreak && job.breakStartTime) {
      totalWorkingSeconds = Math.floor((job.breakStartTime.getTime() - job.checkInTime.getTime()) / 1000);
    } else if (job.checkOutTime) {
      totalWorkingSeconds = Math.floor((job.checkOutTime.getTime() - job.checkInTime.getTime()) / 1000);
      totalWorkingSeconds -= job.totalBreakTime * 60;
    } else {
      totalWorkingSeconds = Math.floor((now.getTime() - job.checkInTime.getTime()) / 1000);
      totalWorkingSeconds -= job.totalBreakTime * 60;
    }

    totalWorkingSeconds = Math.max(0, totalWorkingSeconds);

    const hours = Math.floor(totalWorkingSeconds / 3600);
    const minutes = Math.floor((totalWorkingSeconds % 3600) / 60);
    const seconds = totalWorkingSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getCurrentBreakTime = (job: JobAssignment) => {
    if (!job.isOnBreak || !job.breakStartTime) return "00:00:00";

    const now = new Date();
    const breakSeconds = Math.floor((now.getTime() - job.breakStartTime.getTime()) / 1000);

    const hours = Math.floor(breakSeconds / 3600);
    const minutes = Math.floor((breakSeconds % 3600) / 60);
    const seconds = breakSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  const completeCheckIn = async () => {
    if (selectedJob) {
      const now = new Date();
      const updatedJob = {
        ...selectedJob,
        status: "in_progress" as const,
        checkInTime: now,
      };

      setTodayAssignments((prev) => prev.map((j) => (j.id === selectedJob.id ? updatedJob : j)));
      setCurrentJob(updatedJob);
      setCurrentView("dashboard");

      setSelectedJob(null);
      setSelectedCheckInMethod("");

      try {
        await fetchWorkerJobs();
        console.log("✅ Job data refreshed after check-in");
      } catch (error) {
        console.error("❌ Failed to refresh job data after check-in:", error);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-card max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t("errorLoadingJobs")}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error}</p>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={fetchWorkerJobs}>
              {t("tryAgain")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentView === "checkInMethods" && selectedJob) {
    return (
      <CheckInMethods
        job={selectedJob}
        onBack={() => setCurrentView("dashboard")}
        onMethodSelect={handleCheckInMethodSelect}
      />
    );
  }

  if (currentView === "checkInProcess" && selectedJob) {
    return (
      <CheckInProcess
        job={selectedJob}
        method={selectedCheckInMethod}
        token={session?.accessToken || ""}
        preScannedQrToken={preScannedQrToken}
        onBack={() => {
          setPreScannedQrToken(undefined);
          setCurrentView("dashboard");
        }}
        onComplete={() => {
          setPreScannedQrToken(undefined);
          completeCheckIn();
        }}
      />
    );
  }

  // QR Scanner view removed - now handled by SignInMethodDialog in job-card.tsx

  if (currentView === "jobDetail" && detailJob) {
    return <JobAttendanceDetail job={detailJob} onBack={() => setCurrentView("dashboard")} />;
  }

  const localeMap: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE" };
  const todayLabel = new Date().toLocaleDateString(localeMap[language] || "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const workerName = (session?.user as any)?.name || "Worker";

  return (
    <div className="min-h-screen bg-background">
      {/* Raised when a worker tries to start a job while another is still open.
          Names the running job and offers the one action that resolves it. */}
      <AlertDialog open={!!blockingJob} onOpenChange={(o) => !o && setBlockingJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tg("stillCheckedIn") || "Todavía tienes un fichaje abierto"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p className="font-medium text-foreground">{blockingJob?.title}</p>
                {blockingJob?.checkInTime && (
                  <p className="text-sm">
                    {tg("since") || "Desde"} {formatTimeShort(blockingJob.checkInTime)}
                  </p>
                )}
                <p>
                  {tg("checkOutFirst") ||
                    "Ficha la salida antes de empezar otro trabajo."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tg("cancel") || "Cancelar"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setBlockingJob(null);
                setCurrentView("dashboard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {tg("goToCurrentJob") || "Ir al trabajo actual"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-[1400px] mx-auto p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tg("hello") || "Hello"}, {workerName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{todayLabel}</p>
        </div>

        {/* An open session outranks everything else on this page: it holds the
            running clock plus Check Out and Break. It used to sit below the
            stats and quick actions, roughly two phone screens down. */}
        {currentJob && (
          <CurrentJobCard
            job={currentJob}
            onCheckOut={handleCheckOut}
            onTakeBreak={handleTakeBreak}
            onBackToWork={handleBackToWork}
            onTaskToggle={handleTaskToggle}
            onFillSurvey={handleFillSurvey}
            surveyState={surveyStateFor(currentJob)}
            getCurrentSessionTime={getCurrentSessionTime}
            getCurrentBreakTime={getCurrentBreakTime}
            formatTimeShort={formatTimeShort}
            actionLoading={actionLoading}
          />
        )}

        {bioReg !== true && (
          <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-sm text-foreground">
              <Fingerprint className="w-5 h-5 text-[#662D91] dark:text-purple-300 shrink-0" />
              <span>{tg("enableBiometric") || "Activa la verificación biométrica (huella / Face ID) para tus fichajes."}</span>
            </div>
            <button
              onClick={handleRegisterBio}
              disabled={bioBusy}
              className="text-sm font-bold text-white bg-[#662D91] hover:bg-[#57267c] rounded-lg px-4 py-2 disabled:opacity-50 shrink-0"
            >
              {bioBusy ? "…" : (tg("activate") || "Activar")}
            </button>
          </div>
        )}
        {bioReg === true && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1.5">
            <Fingerprint className="w-3.5 h-3.5" /> {tg("biometricActive") || "Verificación biométrica activada"}
          </div>
        )}

        <section className="space-y-3">
          <SectionLabel>{tg("overview") || "Overview"}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard value={<>{wd.hoursThisWeek}<span className="text-sm font-semibold text-muted-foreground">h</span></>} label={tg("hoursThisWeek") || "Hours this week"} Icon={Clock} tone="brand" />
            <StatCard value={workerStats.todayShifts} label={tg("jobsToday") || "Jobs today"} Icon={Briefcase} tone="info" />
            <StatCard value={workerStats.completedJobs} label={tg("completedJobs") || "Completed"} Icon={CheckCircle} tone="good" />
            <StatCard value={`${workerStats.onTimeRate}%`} label={tg("onTimeRate") || "On-time rate"} Icon={Target} tone="brand" />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{tg("needsAttention") || "Needs your attention"}</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AttentionCard value={wd.missing} label={tg("missingCheckin") || "Missing check-in"} Icon={Clock} tone="warn" onClick={() => router.push("/jobs/mine")} />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{tg("quickActions") || "Quick actions"}</SectionLabel>
          <div className="flex flex-wrap gap-3">
            <ActionButton primary Icon={ClipboardCheck} label={tg("requestManualCheckin") || "Request manual check-in"} onClick={() => router.push("/jobs/mine")} />
            <ActionButton Icon={Calendar} label={tg("mySchedule") || "My schedule"} onClick={() => router.push("/presence/schedule")} />
            <ActionButton Icon={Coins} label={tg("myPayslips") || "My payslips"} onClick={() => router.push("/my-salaries")} />
            <ActionButton Icon={FileText} label={tg("documents") || "Documents"} onClick={() => router.push("/documents")} />
            <ActionButton Icon={MapPin} label={tf("privacy")} onClick={() => setPrivacyOpen(true)} />
          </div>
        </section>

        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-1 border-b border-border">
                  {(["today", "all"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => setJobsTab(tab)}
                      className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${jobsTab === tab ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50" : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"}`}>
                      {tab === "today" ? (tg("todaysJobs") || "Today's jobs") : (tg("allJobs") || "All jobs")}
                      <span className="ml-1.5 text-xs">({tab === "today" ? todayAssignments.filter((j: any) => wd.todayIds.includes(j.publicId)).length : todayAssignments.length})</span>
                    </button>
                  ))}
                </div>
                <JobFilterBar
                  search={jobSearch}
                  onSearch={setJobSearch}
                  status={jobStatus}
                  onStatus={setJobStatus}
                  workCenter={jobWorkCenter}
                  onWorkCenter={setJobWorkCenter}
                  workCenters={jobWorkCenters(todayAssignments)}
                  occupation={jobOcc}
                  onOccupation={setJobOcc}
                  occupations={jobOccupations(todayAssignments)}
                  client={jobClient}
                  onClient={setJobClient}
                  clients={jobClients(todayAssignments)}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {todayAssignments
                    .filter((job) => jobMatchesFilters(job, { search: jobSearch, status: jobStatus, workCenter: jobWorkCenter, client: jobClient, occupation: jobOcc }))
                    .filter((job: any) => jobsTab === "all" || wd.todayIds.includes(job.publicId))
                    .map((job) => (
                    <JobCard
                      key={job.id}
                      job={(wd.liveIds || []).includes((job as any).publicId) ? { ...job, status: "in_progress" } : job}
                      showWorkerCount={false}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      onFillSurvey={handleFillSurvey}
                      onCompleteTask={(j: any, taskId: any) => handleTaskToggle(j.publicId || j.id, taskId)}
                      onViewDetails={(j: any) => handleViewDetail(j)}
                      onRequestManualAttendance={(job: any) => {
                        setManualAttendanceJob(job);
                        setShowManualAttendanceForm(true);
                      }}
                      onEnter={async (job: any, method?: string, data?: any) => {
                        const signingMethod = method?.toLowerCase() || 'web';
                        
                        // Handle different signing methods
                        switch (signingMethod) {
                          case 'web': {
                            // GDPR: get explicit location consent before reading any coordinates.
                            if (!(await ensureLocationConsent())) {
                              toast({ variant: "destructive", title: tf("locNeeded"), description: tf("consentWeb") });
                              break;
                            }
                            // Web check-in captures location for the record. If the browser blocks it,
                            // offer retry / continue-without / cancel instead of a dead end.
                            let webLoc = await getBrowserLocation();
                            let proceed: { latitude?: number; longitude?: number; locationUnavailable?: boolean } | null =
                              webLoc.error ? null : { latitude: webLoc.latitude, longitude: webLoc.longitude };
                            while (!proceed && webLoc.error) {
                              const choice = await openLocationHelp(webLoc.error);
                              if (choice === "retry") {
                                webLoc = await getBrowserLocation();
                                if (!webLoc.error) proceed = { latitude: webLoc.latitude, longitude: webLoc.longitude };
                              } else if (choice === "continue") {
                                proceed = { locationUnavailable: true };
                              } else {
                                break; // cancel
                              }
                            }
                            if (proceed) await handleCheckInWithMethod(job, 'web', proceed);
                            break;
                          }
                          case 'ip':
                            // Check-in with IP address from SignInMethodDialog
                            if (data?.ipAddress) {
                              await handleCheckInWithMethod(job, 'ip', { ipAddress: data.ipAddress });
                            } else {
                              await handleCheckInWithIP(job); // Fallback to fetching IP
                            }
                            break;
                          case 'gps':
                            // GDPR: explicit location consent before using any coordinates.
                            if (!(await ensureLocationConsent())) {
                              toast({ variant: "destructive", title: tf("locNeeded"), description: tf("consentGps") });
                              break;
                            }
                            // Check-in with GPS coordinates from SignInMethodDialog
                            if (data?.latitude && data?.longitude) {
                              await handleCheckInWithMethod(job, 'gps', { 
                                latitude: data.latitude, 
                                longitude: data.longitude 
                              });
                            } else {
                              await handleCheckInWithGPS(job); // Fallback to requesting GPS
                            }
                            break;
                          case 'qrcode':
                            // Route to CheckInProcess, which owns the scanner and the
                            // work-center resolution. The pre-scanned token is handed
                            // over and processed as soon as the screen is ready.
                            if (!guardAgainstOpenSession(job)) break;
                            if (data?.qrToken) {
                              setSelectedJob(job);
                              setSelectedCheckInMethod('qrcode');
                              setPreScannedQrToken(data.qrToken);
                              setCurrentView('checkInProcess');
                            } else {
                              // No token — open CheckInProcess with its built-in QR scanner
                              setSelectedJob(job);
                              setSelectedCheckInMethod('qrcode');
                              setPreScannedQrToken(undefined);
                              setCurrentView('checkInProcess');
                            }
                            break;
                          default:
                            // Fallback to web
                            await handleCheckInWithMethod(job, 'web');
                        }
                      }}
                    />
                  ))}
                </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ListPanel title={tg("recentPayslips") || "Recent payslips"} actionLabel={tg("viewAll") || "View all"} onAction={() => router.push("/my-salaries")}>
            {(wd.payslips || []).length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">—</div>
            ) : (
              (wd.payslips).map((p: any, i: number) => (
                <ListRow
                  key={i}
                  avatar={<RowAvatar tone="brand">&euro;</RowAvatar>}
                  title={p.receiptNumber || p.periodStart || "Nómina"}
                  subtitle={formatLocalDate(p.issueDate || p.createdAt)}
                  right={<div className="text-sm font-bold tabular-nums">{Number(p.total || 0).toFixed(2)}&nbsp;&euro;</div>}
                />
              ))
            )}
          </ListPanel>
          <ListPanel title={tg("thisWeek") || "This week"}>
            {todayAssignments.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">—</div>
            ) : (
              todayAssignments.slice(0, 4).map((job: any) => (
                <ListRow
                  key={job.id}
                  avatar={<RowAvatar tone="muted">{String(job.jobName || job.title || "?").charAt(0).toUpperCase()}</RowAvatar>}
                  title={job.jobName || job.title}
                  subtitle={job.clientName || job.client?.name || ""}
                  right={
                    <StatusChip className={job.status === "in_progress" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : job.status === "completed" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"}>
                      {tg(job.status === "in_progress" ? "inProgress" : job.status === "completed" ? "completed" : "scheduled") || job.status}
                    </StatusChip>
                  }
                />
              ))
            )}
          </ListPanel>
        </div>
      </div>

      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      <SelfieCapture
        open={selfieOpen}
        onCapture={(url) => {
          selfieResolveRef.current?.(url)
          selfieResolveRef.current = null
          setSelfieOpen(false)
        }}
        onClose={() => {
          selfieResolveRef.current?.(null)
          selfieResolveRef.current = null
          setSelfieOpen(false)
        }}
      />

      <GpsConsentDialog
        open={gpsConsentOpen}
        busy={gpsConsentBusy}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      <LocationHelpDialog
        open={locHelpOpen}
        reason={locHelpReason}
        onChoice={handleLocHelpChoice}
      />

      <SurveyFillDialog
        open={!!surveyDialog}
        entry={surveyDialog?.entry || null}
        date={surveyDialog?.date}
        title={tf("workerSurvey")}
        token={session?.accessToken || ""}
        onClose={() => setSurveyDialog(null)}
        onSubmitted={() => {
          if (currentJob) {
            const pub = String((currentJob as any).publicId || currentJob.id);
            setSurveyMap((m) => ({ ...m, [pub]: m[pub] ? { ...(m[pub] as SurveyEntry), filled: true, canFill: false } : m[pub] }));
          }
          setSurveyDialog(null);
        }}
      />

      {/* Manual Attendance Request Modal */}
      <ManualAttendanceRequestForm
        open={showManualAttendanceForm}
        onOpenChange={setShowManualAttendanceForm}
        job={manualAttendanceJob}
        mode="request"
        onSuccess={() => {
          toast({ title: "Manual attendance request submitted" });
        }}
      />
    </div>
  );
}

