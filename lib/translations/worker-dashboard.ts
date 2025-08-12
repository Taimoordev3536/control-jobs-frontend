const workerDashboardTranslations = {
  en: {
    // Dashboard Header
    workerDashboard: "Worker Dashboard",
    atWorkCenter: "At Work Center",
    away: "away",

    // Stats Cards
    todayShifts: "TODAY'S SHIFTS",
    completedJobs: "COMPLETED JOBS",
    hoursToday: "HOURS TODAY",
    onTimeRate: "ON-TIME RATE",
    taskCompletion: "TASK COMPLETION",

    // Current Job Card
    currentJob: "Current Job",
    onBreak: "On Break",
    inProgress: "In Progress",
    tasks: "Tasks",
    workingTime: "Working Time",
    breakTime: "Break Time",
    checkIn: "Check In",
    expectedOut: "Expected Out",
    backToWork: "Back to Work",
    breakOut: "Break Out",
    startBreak: "Start Break",
    checkOut: "Check Out",
    totalBreakTime: "Total Break Time",

    // Break Types
    personal: "Personal",
    teaSmoking: "Tea/Smoking",
    officialWork: "Official Work",
    lunch: "Lunch",
    prayer: "Prayer",
    other: "Other",

    // Job Card
    client: "Client",
    location: "Location",
    duration: "Duration",
    days: "days",
    expectedHours: "Expected Hours",
    status: "Status",
    hasAttendance: "Has Attendance",
    noAttendance: "No Attendance",
    signinMethods: "Sign-in methods",
    viewDetails: "View Details",
    fillSurvey: "Fill Survey",

    // Job Status
    scheduled: "Scheduled",
    completed: "Completed",

    // Tabs
    todayAssignments: "Today's Assignments",
    recentHistory: "Recent History",
    surveys: "Surveys",
    mySurveys: "My Surveys",
    noSurveysYet: "No Surveys Yet",
    noSurveysDescription: "Your completed surveys will appear here after you submit them.",

    // Check-in Flow
    checkInTitle: "Check In",
    chooseCheckInMethod: "Choose Check-in Method",
    gpsLocation: "GPS Location",
    wifiNetwork: "WiFi Network",
    ipAddress: "IP Address",
    qrCodeScanner: "QR Code Scanner",
    callerId: "Caller ID",

    // Check-in Method Descriptions
    verifyLocationGps: "Verify your location using GPS",
    connectWorkplaceWifi: "Connect to the workplace WiFi",
    verifyIpAddress: "Verify using IP address",
    scanQrCode: "Scan the QR code at location",
    verifyPhoneNumber: "Verify using phone number",

    // Check-in Process
    gettingLocation: "Getting your location...",
    allowLocationAccess: "Please allow location access to continue",
    locationDetails: "Location Details",
    expected: "Expected",
    current: "Current",
    detecting: "Detecting...",
    accuracy: "Accuracy",
    locationVerified: "Location Verified",
    verifyLocationCheckIn: "Verify Location & Check In",

    // WiFi Verification
    wifiVerification: "WiFi Verification",
    connectWorkplaceWifiNetwork: "Connect to the workplace WiFi network",
    availableNetworks: "Available Networks",
    workplace: "WORKPLACE",
    connectCheckIn: "Connect & Check In",

    // IP Verification
    ipVerification: "IP Verification",
    verifyingNetworkConnection: "Verifying your network connection",
    networkInformation: "Network Information",
    yourIp: "Your IP",
    expectedRange: "Expected Range",
    network: "Network",
    ipAddressVerified: "IP Address Verified",
    confirmCheckIn: "Confirm & Check In",

    // QR Code Scanner
    scanQrCodeWorkplace: "Scan the QR code at your workplace",
    startingCamera: "Starting camera...",
    startScanner: "Start Scanner",
    stopScanner: "Stop Scanner",
    scanning: "Scanning...",
    waitingForCamera: "Waiting for camera...",
    scanSuccessful: "Scan Successful",
    qrCodeVerified: "QR code verified! Processing check-in...",

    // Instructions
    instructions: "Instructions",
    gpsInstructions: "Make sure you are at the correct location before checking in. GPS accuracy may vary indoors.",
    wifiInstructions: "Connect to the designated workplace WiFi network. Make sure you have the correct password.",
    ipInstructions: "Ensure you are connected to the company network. VPN connections may not work.",
    qrInstructions: "Find the QR code posted at your workplace entrance or designated area and scan it clearly.",

    // Error Messages
    errorLoadingJobs: "Error Loading Jobs",
    tryAgain: "Try Again",
    cameraAccessDenied: "Camera access denied",
    invalidQrCode: "Invalid QR code format. Please try again.",
    qrCodeMismatch: "This QR code is for job {jobId}, but you are checking into job {currentJobId}!",
    checkInSuccessful: "Check-in successful! Welcome to work.",
    checkInFailed: "Failed to record check-in",

    // Job Details Modal
    jobInformation: "Job Information",
    jobPeriod: "Job Period",
    startDate: "Start Date",
    endDate: "End Date",
    totalDays: "Total Days",
    remaining: "Remaining",
    attendanceRate: "Attendance Rate",
    daysWorked: "Days Worked",
    totalHours: "Total Hours",
    avgHoursPerDay: "Avg Hours/Day",
    overview: "Overview",
    attendance: "Attendance",
    statistics: "Statistics",
    attendanceRecords: "Attendance Records",
    export: "Export",
    networkInfo: "Network Information",
    worked: "worked",
    weeklyPerformance: "Weekly Performance",
    monthlyTrends: "Monthly Trends",
    performanceMetrics: "Performance Metrics",
    onTimeRateMetric: "On-time Rate",
    avgDailyHours: "Avg Daily Hours",
    avgBreakTime: "Avg Break Time",
    lateDays: "Late Days",

    // Attendance Status
    present: "Present",
    absent: "Absent",
    late: "Late",
    earlyLeave: "Early Leave",
    noCheckIn: "No check-in",

    // Survey
    jobSurvey: "Job Survey",
    rateExperience: "Rate your experience",
    additionalComments: "Additional comments (optional)",
    submitSurvey: "Submit Survey",
    cancel: "Cancel",
    surveySubmitted: "Survey Submitted",
    thankYouFeedback: "Thank you for your feedback!",

    // Time Formats
    hours: "h",
    minutes: "min",
    seconds: "s",
  },
  es: {
    // Dashboard Header
    workerDashboard: "Panel del Trabajador",
    atWorkCenter: "En el Centro de Trabajo",
    away: "lejos",

    // Stats Cards
    todayShifts: "TURNOS DE HOY",
    completedJobs: "TRABAJOS COMPLETADOS",
    hoursToday: "HORAS HOY",
    onTimeRate: "TASA DE PUNTUALIDAD",
    taskCompletion: "FINALIZACIÓN DE TAREAS",

    // Current Job Card
    currentJob: "Trabajo Actual",
    onBreak: "En Descanso",
    inProgress: "En Progreso",
    tasks: "Tareas",
    workingTime: "Tiempo de Trabajo",
    breakTime: "Tiempo de Descanso",
    checkIn: "Registrar Entrada",
    expectedOut: "Salida Esperada",
    backToWork: "Volver al Trabajo",
    breakOut: "Salir a Descanso",
    startBreak: "Iniciar Descanso",
    checkOut: "Registrar Salida",
    totalBreakTime: "Tiempo Total de Descanso",

    // Break Types
    personal: "Personal",
    teaSmoking: "Té/Fumar",
    officialWork: "Trabajo Oficial",
    lunch: "Almuerzo",
    prayer: "Oración",
    other: "Otro",

    // Job Card
    client: "Cliente",
    location: "Ubicación",
    duration: "Duración",
    days: "días",
    expectedHours: "Horas Esperadas",
    status: "Estado",
    hasAttendance: "Tiene Asistencia",
    noAttendance: "Sin Asistencia",
    signinMethods: "Métodos de registro",
    viewDetails: "Ver Detalles",
    fillSurvey: "Llenar Encuesta",

    // Job Status
    scheduled: "Programado",
    completed: "Completado",

    // Tabs
    todayAssignments: "Asignaciones de Hoy",
    recentHistory: "Historial Reciente",
    surveys: "Encuestas",
    mySurveys: "Mis Encuestas",
    noSurveysYet: "Aún No Hay Encuestas",
    noSurveysDescription: "Tus encuestas completadas aparecerán aquí después de enviarlas.",

    // Check-in Flow
    checkInTitle: "Registrar Entrada",
    chooseCheckInMethod: "Elegir Método de Registro",
    gpsLocation: "Ubicación GPS",
    wifiNetwork: "Red WiFi",
    ipAddress: "Dirección IP",
    qrCodeScanner: "Escáner de Código QR",
    callerId: "ID de Llamada",

    // Check-in Method Descriptions
    verifyLocationGps: "Verificar tu ubicación usando GPS",
    connectWorkplaceWifi: "Conectar al WiFi del lugar de trabajo",
    verifyIpAddress: "Verificar usando dirección IP",
    scanQrCode: "Escanear el código QR en la ubicación",
    verifyPhoneNumber: "Verificar usando número de teléfono",

    // Check-in Process
    gettingLocation: "Obteniendo tu ubicación...",
    allowLocationAccess: "Por favor permite el acceso a la ubicación para continuar",
    locationDetails: "Detalles de Ubicación",
    expected: "Esperado",
    current: "Actual",
    detecting: "Detectando...",
    accuracy: "Precisión",
    locationVerified: "Ubicación Verificada",
    verifyLocationCheckIn: "Verificar Ubicación y Registrar Entrada",

    // WiFi Verification
    wifiVerification: "Verificación WiFi",
    connectWorkplaceWifiNetwork: "Conectar a la red WiFi del lugar de trabajo",
    availableNetworks: "Redes Disponibles",
    workplace: "LUGAR DE TRABAJO",
    connectCheckIn: "Conectar y Registrar Entrada",

    // IP Verification
    ipVerification: "Verificación IP",
    verifyingNetworkConnection: "Verificando tu conexión de red",
    networkInformation: "Información de Red",
    yourIp: "Tu IP",
    expectedRange: "Rango Esperado",
    network: "Red",
    ipAddressVerified: "Dirección IP Verificada",
    confirmCheckIn: "Confirmar y Registrar Entrada",

    // QR Code Scanner
    scanQrCodeWorkplace: "Escanea el código QR en tu lugar de trabajo",
    startingCamera: "Iniciando cámara...",
    startScanner: "Iniciar Escáner",
    stopScanner: "Detener Escáner",
    scanning: "Escaneando...",
    waitingForCamera: "Esperando cámara...",
    scanSuccessful: "Escaneo Exitoso",
    qrCodeVerified: "¡Código QR verificado! Procesando registro de entrada...",

    // Instructions
    instructions: "Instrucciones",
    gpsInstructions:
      "Asegúrate de estar en la ubicación correcta antes de registrar entrada. La precisión del GPS puede variar en interiores.",
    wifiInstructions:
      "Conéctate a la red WiFi designada del lugar de trabajo. Asegúrate de tener la contraseña correcta.",
    ipInstructions: "Asegúrate de estar conectado a la red de la empresa. Las conexiones VPN pueden no funcionar.",
    qrInstructions:
      "Encuentra el código QR publicado en la entrada de tu lugar de trabajo o área designada y escanéalo claramente.",

    // Error Messages
    errorLoadingJobs: "Error al Cargar Trabajos",
    tryAgain: "Intentar de Nuevo",
    cameraAccessDenied: "Acceso a cámara denegado",
    invalidQrCode: "Formato de código QR inválido. Por favor intenta de nuevo.",
    qrCodeMismatch:
      "¡Este código QR es para el trabajo {jobId}, pero estás registrando entrada al trabajo {currentJobId}!",
    checkInSuccessful: "¡Registro de entrada exitoso! Bienvenido al trabajo.",
    checkInFailed: "Error al registrar entrada",

    // Job Details Modal
    jobInformation: "Información del Trabajo",
    jobPeriod: "Período del Trabajo",
    startDate: "Fecha de Inicio",
    endDate: "Fecha de Fin",
    totalDays: "Días Totales",
    remaining: "Restante",
    attendanceRate: "Tasa de Asistencia",
    daysWorked: "Días Trabajados",
    totalHours: "Horas Totales",
    avgHoursPerDay: "Promedio Horas/Día",
    overview: "Resumen",
    attendance: "Asistencia",
    statistics: "Estadísticas",
    attendanceRecords: "Registros de Asistencia",
    export: "Exportar",
    networkInfo: "Información de Red",
    worked: "trabajado",
    weeklyPerformance: "Rendimiento Semanal",
    monthlyTrends: "Tendencias Mensuales",
    performanceMetrics: "Métricas de Rendimiento",
    onTimeRateMetric: "Tasa de Puntualidad",
    avgDailyHours: "Promedio Horas Diarias",
    avgBreakTime: "Tiempo Promedio de Descanso",
    lateDays: "Días de Retraso",

    // Attendance Status
    present: "Presente",
    absent: "Ausente",
    late: "Tarde",
    earlyLeave: "Salida Temprana",
    noCheckIn: "Sin registro de entrada",

    // Survey
    jobSurvey: "Encuesta del Trabajo",
    rateExperience: "Califica tu experiencia",
    additionalComments: "Comentarios adicionales (opcional)",
    submitSurvey: "Enviar Encuesta",
    cancel: "Cancelar",
    surveySubmitted: "Encuesta Enviada",
    thankYouFeedback: "¡Gracias por tu retroalimentación!",

    // Time Formats
    hours: "h",
    minutes: "min",
    seconds: "s",
  },
}

export default workerDashboardTranslations
