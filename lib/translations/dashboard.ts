const dashboardTranslations: Record<string, Record<string, string>> = {
  en: {
  // Schedule types
  free: "Free",
  normal: "Normal",
  summer: "Summer",

    // Header
    clientDashboard: "Client Dashboard",
    manageJobsAndTrack: "Manage your jobs and track worker performance",
    settings: "Settings",

    // Stats Cards
    totalJobs: "Total Jobs",
    activeJobs: "Active Jobs",
    totalWorkers: "Total Workers",
    totalAmount: "Total Amount",
    completedJobs: "Completed Jobs",
    averageRating: "Average Rating",
    pendingSurveys: "Pending Surveys",

    // Tabs
    jobs: "Jobs",
    workers: "Workers",
    analytics: "Analytics",
    surveys: "Surveys",

   // Job Status
    inProgress: "In Progress",
    scheduled: "Scheduled",
    completed: "Completed",
    paused: "Paused",
    active: "Active",
    pending: "Pending",
    cancelled: "Cancelled",
    onHold: "On Hold",

    // Job Details
    recentJobs: "Recent Jobs",
    noJobsFound: "No Jobs Found",
    noJobsCreated: "You haven't created any jobs yet.",
    viewDetails: "View Details",
    message: "Message",

    // Worker Performance
    workerPerformance: "Worker Performance",
    workerAnalyticsComingSoon: "Worker Analytics Coming Soon",
    workerAnalyticsDescription: "Detailed worker performance metrics will be available here.",

    // Analytics
    analyticsReports: "Analytics & Reports",
    analyticsComingSoon: "Analytics Coming Soon",
    analyticsDescription: "Comprehensive analytics and reporting features will be available here.",

    // Surveys
    jobSurveysFeedback: "Job Surveys & Feedback",
    noSurveysYet: "No Surveys Yet",
    surveysDescription: "Survey responses will appear here once jobs are completed.",
    submitted: "Submitted",

    // Time and Date
    hours: "hours",
    hour: "h",
    minutes: "min",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",

    // Actions
    records: "Records",
    details: "Details",
    refresh: "Refresh",
    filter: "Filter",
    search: "Search",
    searchJobs: "Search jobs...",

    // Loading and Error States
    loadingJobs: "Loading your jobs...",
    errorLoadingJobs: "Error Loading Jobs",
    failedToLoadDashboard: "Failed to Load Dashboard",
    tryAgain: "Try Again",

    // Job Information
    workCenter: "Work Center",
    expectedHours: "Expected Hours",
    duration: "Duration",
    day: "day",
    days: "days",
    fixedSchedule: "Fixed Schedule",
    flexibleSchedule: "Flexible Schedule",

    // Survey Status
    surveyCompleted: "Survey Completed",
    rating: "Rating",

    // Common Actions
    scanQR: "Scan QR",
    generateQR: "Generate QR",
    checkIn: "Check In",
    checkOut: "Check Out",

    // Job Card Information
    worker: "Worker",
    location: "Location",
    client: "Client",
    status: "Status",

    // Time Tracking
    workTime: "Work Time",
    breakTime: "Break Time",
    totalTime: "Total Time",

    // Attendance
    attendance: "Attendance",
    attendanceDetails: "Attendance Details",
    dayOverview: "Day Overview",

    // Navigation
    back: "Back",
    dashboard: "Dashboard",

    // Job Types
    cleaning: "Cleaning",
    maintenance: "Maintenance",
    security: "Security",
    gardening: "Gardening",

    // Priority
    high: "High",
    medium: "Medium",
    low: "Low",

    // Notifications
    newJobAssigned: "New job assigned",
    jobCompleted: "Job completed",
    workerCheckedIn: "Worker checked in",
    workerCheckedOut: "Worker checked out",
  },
  es: {

  // Schedule types
  free: "Libre",
  normal: "Habitual",
  summer: "Verano",

    // Header
    clientDashboard: "Panel de Cliente",
    manageJobsAndTrack: "Gestiona tus trabajos y rastrea el rendimiento de los trabajadores",
    settings: "Configuración",

    // Stats Cards
    totalJobs: "Total de Trabajos",
    activeJobs: "Trabajos Activos",
    totalWorkers: "Total de Trabajadores",
    totalAmount: "Cantidad Total",
    completedJobs: "Trabajos Completados",
    averageRating: "Calificación Promedio",
    pendingSurveys: "Encuestas Pendientes",

    // Tabs
    jobs: "Trabajos",
    workers: "Trabajadores",
    analytics: "Análisis",
    surveys: "Encuestas",

    // Job Status
    scheduled: "Programado",
    inProgress: "En Progreso",
    completed: "Completado",
    cancelled: "Cancelado",
    onHold: "En Espera",
    pending: "Pendiente",

    // Job Details
    recentJobs: "Trabajos Recientes",
    noJobsFound: "No se Encontraron Trabajos",
    noJobsCreated: "Aún no has creado ningún trabajo.",
    viewDetails: "Ver Detalles",
    message: "Mensaje",

    // Worker Performance
    workerPerformance: "Rendimiento del Trabajador",
    workerAnalyticsComingSoon: "Análisis de Trabajadores Próximamente",
    workerAnalyticsDescription: "Las métricas detalladas de rendimiento de trabajadores estarán disponibles aquí.",

    // Analytics
    analyticsReports: "Análisis e Informes",
    analyticsComingSoon: "Análisis Próximamente",
    analyticsDescription: "Las funciones completas de análisis e informes estarán disponibles aquí.",

    // Surveys
    jobSurveysFeedback: "Encuestas y Comentarios de Trabajos",
    noSurveysYet: "Aún No Hay Encuestas",
    surveysDescription: "Las respuestas de encuestas aparecerán aquí una vez que se completen los trabajos.",
    submitted: "Enviado",

    // Time and Date
    hours: "horas",
    hour: "h",
    minutes: "min",
    today: "Hoy",
    yesterday: "Ayer",
    thisWeek: "Esta Semana",
    thisMonth: "Este Mes",

    // Actions
    records: "Registros",
    details: "Detalles",
    refresh: "Actualizar",
    filter: "Filtrar",
    search: "Buscar",
    searchJobs: "Buscar trabajos...",

    // Loading and Error States
    loadingJobs: "Cargando tus trabajos...",
    errorLoadingJobs: "Error al Cargar Trabajos",
    failedToLoadDashboard: "Error al Cargar el Panel",
    tryAgain: "Intentar de Nuevo",

    // Job Information
    workCenter: "Centro de Trabajo",
    expectedHours: "Horas Esperadas",
    duration: "Duración",
    day: "día",
    days: "días",
    fixedSchedule: "Horario Fijo",
    flexibleSchedule: "Horario Flexible",

    // Survey Status
    surveyCompleted: "Encuesta Completada",
    rating: "Calificación",

    // Common Actions
    scanQR: "Escanear QR",
    generateQR: "Generar QR",
    checkIn: "Registrar Entrada",
    checkOut: "Registrar Salida",

    // Job Card Information
    worker: "Trabajador",
    location: "Ubicación",
    client: "Cliente",
    status: "Estado",

    // Time Tracking
    workTime: "Tiempo de Trabajo",
    breakTime: "Tiempo de Descanso",
    totalTime: "Tiempo Total",

    // Attendance
    attendance: "Asistencia",
    attendanceDetails: "Detalles de Asistencia",
    dayOverview: "Resumen del Día",

    // Navigation
    back: "Atrás",
    dashboard: "Panel",

    // Job Types
    cleaning: "Limpieza",
    maintenance: "Mantenimiento",
    security: "Seguridad",
    gardening: "Jardinería",

    // Priority
    high: "Alta",
    medium: "Media",
    low: "Baja",

    // Notifications
    newJobAssigned: "Nuevo trabajo asignado",
    jobCompleted: "Trabajo completado",
    workerCheckedIn: "Trabajador registró entrada",
    workerCheckedOut: "Trabajador registró salida",
  },
}

export default dashboardTranslations
