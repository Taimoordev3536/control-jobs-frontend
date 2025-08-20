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
  ClipboardList,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import { JobCard } from "./job-card"
import { CurrentJobCard } from "./current-job-card"
import { SurveyCard } from "@/components/ui/survey-card"
import { CheckInMethods } from "@/components/dashboards/worker-dashboard/check-in-methods"
import { CheckInProcess } from "@/components/dashboards/worker-dashboard/check-in-process"
import { JobAttendanceDetail } from "@/components/job-attendance-detail"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"

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
  jobName: string;
  clientName: string;
  workCenter: string;
  status: string;
  totalShifts: number;
  expectedDuration: number;
  startDate?: string;
  endDate?: string;
  tasks: Array<{
    id: number;
    name: string;
    note?: string;
    expectedDuration?: number;
    taskHistories: TaskHistory[];
  }>;
  shifts: Array<{
    shiftType: string;
    startTime: string;
    endTime: string;
    totalHours: number;
  }>;
  signingMethods: Array<{
    methodType: string;
    methodDetails: string[];
    verifyIdentity: boolean;
  }>;
  workSession?: {
    id: number;
    checkInTime: string;
    checkOutTime?: string;
    isOnBreak: boolean;
    currentBreakStart?: string;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
  } | null;
  attendanceRecords?: Array<{
    id: number;
    checkInTime: string;
    checkOutTime?: string;
    date: string;
  }>;
}

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
  const { session } = useAuth();

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
  const [activeTab, setActiveTab] = useState("assignments");
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check-in flow states
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedJob, setSelectedJob] = useState<JobAssignment | null>(null);
  const [selectedCheckInMethod, setSelectedCheckInMethod] = useState("");

  // Survey states
  const [surveyJob, setSurveyJob] = useState<JobAssignment | null>(null);

  // Job detail view state
  const [detailJob, setDetailJob] = useState<JobAssignment | null>(null);

  // Transform API job data to frontend job format
  const transformApiJobToJobAssignment = (apiJob: ApiWorkerJob): JobAssignment => {
    const currentDate = new Date();
    const today = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

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
          apiJob.attendanceRecords.some((record) => record.checkInTime && record.checkOutTime),
      ) || Boolean(apiJob.workSession?.checkInTime && apiJob.workSession?.checkOutTime);

    if (currentDate > endDate) {
      status = hasAttendanceRecord ? "completed" : "scheduled";
    } else {
      status = hasAttendanceRecord || apiJob.workSession?.checkInTime ? "in_progress" : "scheduled";
    }

    // Get shift info
    const firstShift = apiJob.shifts[0];
    let shiftInfo;
    if (firstShift) {
      shiftInfo = {
        type: firstShift.shiftType as "morning" | "afternoon" | "evening",
        startTime: firstShift.startTime,
        endTime: firstShift.endTime,
        duration: `${firstShift.totalHours} hours`,
        scheduleType: "fixed" as const,
      };
    } else {
      shiftInfo = {
        type: "morning" as const,
        duration: `${apiJob.expectedDuration} hours`,
        scheduleType: "flexible" as const,
      };
    }

    // Transform signing methods
    const signingMethods = apiJob.signingMethods[0] || { methodDetails: [], verifyIdentity: false };
    const methods = {
      qrCode: signingMethods.methodDetails.includes("qrcode") || signingMethods.methodDetails.includes("qr-code"),
      gps: signingMethods.methodDetails.includes("gps"),
      wifi: signingMethods.methodDetails.includes("wifi"),
      ip: signingMethods.methodDetails.includes("ip"),
      callerId: signingMethods.methodDetails.includes("caller"),
    };

    // Transform tasks with TaskHistory
    const tasks = apiJob.tasks.map((task) => {
      // Find TaskHistory for today - add null check for taskHistories
      const todayHistory = task.taskHistories?.find((history) => history.date === today);
      return {
        id: task.id,
        name: task.name,
        description: task.note || `Complete ${task.name.toLowerCase()}`,
        completed: todayHistory ? todayHistory.isCompleted : false,
        duration: task.expectedDuration ? `${task.expectedDuration} min` : "30 min",
        timing: "during" as const,
      };
    });

    return {
      id: apiJob.jobId,
      jobId: `JOB-${apiJob.jobId.toString().padStart(4, "0")}`,
      title: apiJob.jobName,
      client: {
        id: Math.floor(Math.random() * 100) + 1,
        name: apiJob.clientName,
      },
      workCenter: {
        id: Math.floor(Math.random() * 10) + 1,
        name: apiJob.workCenter,
        address: `${apiJob.workCenter} Address`,
        coordinates: { lat: 37.4419, lng: -122.143 },
      },
      shift: shiftInfo,
      status,
      startDate,
      endDate,
      signingMethods: methods,
      tasks,
      checkInTime: apiJob.workSession?.checkInTime ? new Date(apiJob.workSession.checkInTime) : undefined,
      checkOutTime: apiJob.workSession?.checkOutTime ? new Date(apiJob.workSession.checkOutTime) : undefined,
      breakTime: apiJob.workSession?.totalBreakMinutes || 0,
      workedTime: apiJob.workSession?.totalWorkMinutes || 0,
      expectedHours: firstShift?.totalHours || apiJob.expectedDuration,
      totalHours: status === "completed" ? firstShift?.totalHours || apiJob.expectedDuration : undefined,
      totalBreakTime: apiJob.workSession?.totalBreakMinutes || 0,
      isOnBreak: apiJob.workSession?.isOnBreak || false,
      breakStartTime: apiJob.workSession?.currentBreakStart
        ? new Date(apiJob.workSession.currentBreakStart)
        : undefined,
      tags: apiJob.tasks.slice(0, 2).map((task) => task.name),
      hasAttendanceRecord,
      survey:
        status === "completed"
          ? {
              rating: Math.floor(Math.random() * 2) + 4,
              comments: "Job completed successfully",
              submitted: Math.random() > 0.5,
              submittedAt: status === "completed" ? new Date() : undefined,
            }
          : undefined,
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiWorkerResponse = await response.json();

      if (data.isSuccess && data.data) {
        const transformedJobs = data.data.map(transformApiJobToJobAssignment);
        setTodayAssignments(transformedJobs);

        // Set current job
        let newCurrentJob = transformedJobs.find(
          (job) => job.status === "in_progress" && job.checkInTime && !job.checkOutTime && new Date() <= job.endDate,
        );

        if (!newCurrentJob && currentJob) {
          const existingCurrentJob = transformedJobs.find((job) => job.id === currentJob.id);
          if (
            existingCurrentJob &&
            existingCurrentJob.status === "in_progress" &&
            existingCurrentJob.checkInTime &&
            !existingCurrentJob.checkOutTime
          ) {
            newCurrentJob = existingCurrentJob;
          }
        }

        setCurrentJob(newCurrentJob || null);

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
    setCurrentView("checkInMethods");
  };

  const handleCheckInMethodSelect = (method: string) => {
    setSelectedCheckInMethod(method);
    setCurrentView("checkInProcess");
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
          jobId: job.id,
          scanType: "check-out",
          location: JSON.stringify({
            address: locationData?.address || job.workCenter.address,
            ip: userIP,
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            qrData: null,
          }),
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
        await fetchWorkerJobs();
      } else {
        throw new Error(data.message || "Failed to check out");
      }
    } catch (error) {
      console.error("Error checking out:", error);
      setError(error instanceof Error ? error.message : "Failed to check out");
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
          jobId: job.id,
          scanType: "break-start",
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
      setError(error instanceof Error ? error.message : "Failed to start break");
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
          jobId: job.id,
          scanType: "break-end",
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
        const now = new Date();
        const breakDuration = job.breakStartTime
          ? Math.floor((now.getTime() - job.breakStartTime.getTime()) / 1000 / 60)
          : 0;

        const updatedJob = {
          ...job,
          status: "in_progress" as const,
          isOnBreak: false,
          totalBreakTime: job.totalBreakTime + breakDuration,
          breakStartTime: undefined,
        };

        setTodayAssignments((prev) => prev.map((j) => (j.id === job.id ? updatedJob : j)));
        setCurrentJob(updatedJob);
      } else {
        throw new Error(data.message || "Failed to end break");
      }
    } catch (error) {
      console.error("Error ending break:", error);
      setError(error instanceof Error ? error.message : "Failed to end break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTaskToggle = async (jobId: number, taskId: number) => {
    try {
      setActionLoading(true);

      if (!session?.accessToken || !session?.user?.id) {
        throw new Error("No access token or user ID found");
      }

      // Use the user ID from the session instead of making an API call
      // Convert to number if it's a string (NextAuth stores IDs as strings)
      const workerId = typeof session.user.id === 'string' ? parseInt(session.user.id, 10) : session.user.id;

      // Call the toggle-task endpoint with the correct parameter order
      // The backend expects /jobs/:taskId/toggle-task/:workerId
      // But we need to pass the actual task ID, not the job ID as the first parameter
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
        // The backend returns a TaskHistory object
        // Extract isCompleted from the response data
        const isCompleted = data?.isCompleted;
        
        // If we can't find isCompleted in the response, toggle the current state
        // This provides a fallback in case the API response structure changes
        const toggledTask = todayAssignments
          .find(job => job.id === jobId)?.tasks
          .find(task => task.id === taskId);
        
        const newCompletedState = isCompleted !== undefined ? isCompleted : 
          (toggledTask ? !toggledTask.completed : false);
        
        // Update local state with the task completion status
        setTodayAssignments((prev) =>
          prev.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  tasks: job.tasks.map((task) =>
                    task.id === taskId ? { ...task, completed: newCompletedState } : task,
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
                    task.id === taskId ? { ...task, completed: newCompletedState } : task,
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
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 rounded-full animate-spin border-t-purple-600"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="border border-red-200 dark:border-red-800 shadow-sm bg-white dark:bg-gray-900 max-w-md">
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
        onBack={() => setCurrentView("checkInMethods")}
        onComplete={completeCheckIn}
      />
    );
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("workerDashboard")}</h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
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
                  <div className="flex items-center gap-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
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

        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                onClick={() => setActiveTab("assignments")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "assignments"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {t("todayAssignments")}
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "history"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {t("recentHistory")}
              </button>
              <button
                onClick={() => setActiveTab("surveys")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "surveys"
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {t("surveys")}
              </button>
            </div>

            {activeTab === "assignments" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onFillSurvey={handleFillSurvey}
                    onCompleteTask={handleTaskToggle}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {todayAssignments
                  .filter((job) => job.status === "completed")
                  .map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onFillSurvey={handleFillSurvey}
                      onViewDetail={handleViewDetail}
                      showActions={true}
                    />
                  ))}
              </div>
            )}

            {activeTab === "surveys" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  {t("mySurveys")}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {todayAssignments
                    .filter((job) => job.survey?.submitted)
                    .map((job) => (
                      <SurveyCard key={job.id} job={job} onSubmit={() => {}} onCancel={() => {}} isFullPage={false} />
                    ))}
                </div>

                {todayAssignments.filter((job) => job.survey?.submitted).length === 0 && (
                  <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                    <CardContent className="p-8 text-center">
                      <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                        {t("noSurveysYet")}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{t("noSurveysDescription")}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

