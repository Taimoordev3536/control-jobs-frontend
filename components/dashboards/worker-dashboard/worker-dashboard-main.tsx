"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  CheckCircle,
  Timer,
  Target,
  CheckSquare,
  User,
  MapPin,
  Navigation,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import JobCard from "./job-card"
import { CurrentJobCard } from "./current-job-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { CheckInMethods } from "@/components/dashboards/worker-dashboard/check-in-methods"
import { CheckInProcess } from "@/components/dashboards/worker-dashboard/check-in-process"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

// Extract user-friendly message from a raw backend error (JSON string or Error)
function parseBackendError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  // Try to parse embedded JSON like: {"message":"...","statusCode":500,...}
  try {
    const json = JSON.parse(msg.replace(/^[^{]*/, ''));
    return json?.message || fallback;
  } catch {
    return msg || fallback;
  }
}

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
  const { session, logout } = useAuth();

  const [todayAssignments, setTodayAssignments] = useState<JobAssignment[]>([]);
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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  // removed tab menu - show assignments directly
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Local-day helper using viewer timezone
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateKeyInTz = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: viewerTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const y = parts.find((p) => p.type === "year")!.value;
    const m = parts.find((p) => p.type === "month")!.value;
    const da = parts.find((p) => p.type === "day")!.value;
    return `${y}-${m}-${da}`;
  };

  // Check-in flow states
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedJob, setSelectedJob] = useState<JobAssignment | null>(null);
  const [selectedCheckInMethod, setSelectedCheckInMethod] = useState("");
  // When a QR is scanned in the SignInMethodDialog, store it here and
  // route to CheckInProcess which will collect GPS → IP → then process the token
  const [preScannedQrToken, setPreScannedQrToken] = useState<string | undefined>(undefined);

  // Survey states
  const [surveyJob, setSurveyJob] = useState<JobAssignment | null>(null);

  // Job detail view state
  const [detailJob, setDetailJob] = useState<JobAssignment | null>(null);
  
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
  const today = dateKeyInTz(currentDate); // YYYY-MM-DD in viewer TZ

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

  if (currentDate > endDate) {
    status = hasAttendanceRecord ? "completed" : "scheduled";
  } else {
    // If there's an active session or completed attendance, it's in progress
    status = hasActiveSession || hasAttendanceRecord || apiJob.workSession?.checkInTime
      ? "in_progress"
      : "scheduled";
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
    client: {
      id: apiJob.clientId || 0,
      name: apiJob.clientName,
    },
    workCenter: {
      id: (apiJob.workCenters && apiJob.workCenters[0] && apiJob.workCenters[0].id) || 0,
      name: firstWorkCenterName,
      address: `${firstWorkCenterName} Address`,
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
        ? firstShift?.totalHours || apiJob.expectedDuration
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

        // Set current job - find any job with active work session
        let newCurrentJob = transformedJobs.find(
          (job) => job.status === "in_progress" && job.checkInTime && !job.checkOutTime && new Date() <= job.endDate,
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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleCheckIn = (job: JobAssignment) => {
    setSelectedJob(job);
    setSelectedCheckInMethod("default"); // Set a default method if needed
    setCurrentView("checkInProcess"); // Go directly to check-in process
  };

  const handleCheckInMethodSelect = (method: string) => {
    setSelectedCheckInMethod(method);
    setCurrentView("checkInProcess");
  };

  // Handle check-in with specific signing method
  const handleCheckInWithMethod = async (job: any, signingMethod: string, additionalData?: any) => {
    try {
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

    } catch (error) {
      console.error("Check-in error:", error);
      toast({ variant: "destructive", title: "Check-in Failed", description: parseBackendError(error, "Failed to check in") });
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
        toast({ variant: "destructive", title: "GPS Check-in Failed", description: parseBackendError(error, "Failed to check in with GPS") });
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
          address: job.workCenter.address,
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
            address: locationData?.address || job.workCenter.address,
            ip: userIP,
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            qrData: null,
          }),
          notes: t("workSessionCompleted"),
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
        await fetchWorkerJobs();
      } else {
        throw new Error(data.message || "Failed to check out");
      }
    } catch (error) {
      console.error("Error checking out:", error);
      toast({ variant: "destructive", title: "Check-out Failed", description: parseBackendError(error, "Failed to check out") });
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
          address: job.workCenter.address,
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
            address: locationData?.address || job.workCenter.address,
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
      toast({ variant: "destructive", title: "Break Start Failed", description: parseBackendError(error, "Failed to start break") });
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
          address: job.workCenter.address,
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
            address: locationData?.address || job.workCenter.address,
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
        await fetchJobs();
      } else {
        throw new Error(data.message || "Failed to end break");
      }
    } catch (error) {
      console.error("Error ending break:", error);
      toast({ variant: "destructive", title: "Break End Failed", description: parseBackendError(error, "Failed to end break") });
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

  const handleSurveySubmit = (rating: number, comments: string) => {
    if (!surveyJob) return;

    const newSurvey = {
      rating,
      comments,
      submitted: true,
      submittedAt: new Date(),
    };

    setTodayAssignments((prev) => prev.map((job) => (job.id === surveyJob.id ? { ...job, survey: newSurvey } : job)));
    setSurveyJob(null);
    setCurrentView("dashboard");
  };

  const handleFillSurvey = (job: JobAssignment) => {
    setSurveyJob(job);
    setCurrentView("survey");
  };

  const handleViewDetail = (job: JobAssignment) => {
    setDetailJob(job);
    setCurrentView("jobDetail");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatTimeShort = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
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

  if (currentView === "survey" && surveyJob) {
    return (
      <SurveyCard
        job={surveyJob}
        onSubmit={handleSurveySubmit}
        onCancel={() => setCurrentView("dashboard")}
        isFullPage={true}
      />
    );
  }

  if (currentView === "jobDetail" && detailJob) {
    return <JobAttendanceDetail job={detailJob} onBack={() => setCurrentView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{t("workerDashboard")}</h1>
                  <p className="text-muted-foreground text-sm" suppressHydrationWarning>
                    {formatTime(currentTime)} •{" "}
                    {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {locationData.isAtWorkCenter ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
                    <Navigation className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("atWorkCenter")}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {locationData.distance}m {t("away")}
                    </span>
                  </div>
                )}
                {locationData.city && locationData.country && (
                  <div className="flex items-center gap-2 bg-muted text-muted-foreground px-3 py-1.5 rounded-lg border border-border">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {locationData.city}, {locationData.country}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatsCard label={t("todayShifts")} value={workerStats.todayShifts} icon={Calendar} />
          <StatsCard label={t("completedJobs")} value={workerStats.completedJobs} icon={CheckCircle} />
          <StatsCard label={t("hoursToday")} value={`${workerStats.totalHours}${t("hours")}`} icon={Timer} />
          <StatsCard label={t("onTimeRate")} value={`${workerStats.onTimeRate}%`} icon={Target} />
          <StatsCard label={t("taskCompletion")} value={`${workerStats.taskCompletionRate}%`} icon={CheckSquare} />
        </div>

        {currentJob && (
          <CurrentJobCard
            job={currentJob}
            onCheckOut={handleCheckOut}
            onTakeBreak={handleTakeBreak}
            onBackToWork={handleBackToWork}
            onTaskToggle={handleTaskToggle}
            getCurrentSessionTime={getCurrentSessionTime}
            getCurrentBreakTime={getCurrentBreakTime}
            formatTimeShort={formatTimeShort}
            actionLoading={actionLoading}
          />
        )}

        <Card className="border-border shadow-sm bg-card">
          <CardContent className="p-4">
                {/* Show today's assignments directly (menu removed) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {todayAssignments.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onCheckIn={handleCheckIn}
                      onCheckOut={handleCheckOut}
                      onFillSurvey={handleFillSurvey}
                      onCompleteTask={(j: any, taskId: any) => handleTaskToggle(j.publicId || j.id, taskId)}
                      onViewDetail={handleViewDetail}
                      onEnter={async (job: any, method?: string, data?: any) => {
                        const signingMethod = method?.toLowerCase() || 'web';
                        
                        // Handle different signing methods
                        switch (signingMethod) {
                          case 'web':
                            // Direct check-in with web method (free)
                            await handleCheckInWithMethod(job, 'web');
                            break;
                          case 'ip':
                            // Check-in with IP address from SignInMethodDialog
                            if (data?.ipAddress) {
                              await handleCheckInWithMethod(job, 'ip', { ipAddress: data.ipAddress });
                            } else {
                              await handleCheckInWithIP(job); // Fallback to fetching IP
                            }
                            break;
                          case 'gps':
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
                            // Route to CheckInProcess so GPS → IP → WC selection happens
                            // before the check-in API call. The pre-scanned token is stored
                            // and picked up automatically once GPS+IP verification completes.
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
      </div>
    </div>
  );
}

