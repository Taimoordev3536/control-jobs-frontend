const manualAttendanceTranslations: Record<string, Record<string, string>> = {
  en: {
    // ---------- List page ----------
    myAttendanceRequests: "My Attendance Requests",
    attendanceRequests: "Attendance Requests",
    myAttendanceRequestsDesc: "Track your manual attendance requests and their status",
    attendanceRequestsDesc: "Review and manage worker attendance requests",
    newRequest: "New Request",

    // Stat cards
    total: "Total",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    all: "All",

    // Request types
    fullDay: "Full Day",
    checkInOnly: "Check-in Only",
    checkOutOnly: "Check-out Only",
    editExisting: "Edit Existing",
    fullDayDesc: "Missed entire shift",
    checkInOnlyDesc: "Missed check-in",
    checkOutOnlyDesc: "Missed check-out",
    editExistingDesc: "Correct times",

    // Empty states
    noRequestsFound: "No requests found",
    noRequestsFoundDesc:
      "Create a manual attendance request when you need to log time you couldn't check in or out for.",
    noRequestsToReviewDesc: "There are no attendance requests matching this filter.",

    // Card fields
    date: "Date",
    times: "Times",
    job: "Job",
    workCenter: "Work Center",
    unknownJob: "Unknown Job",
    reason: "Reason",
    submitted: "Submitted",
    approvedBy: "Approved by",
    employer: "Employer",

    // Reviewer panel (shown to employer/client)
    reviewNotes: "Review Notes",
    reviewerNotes: "Reviewer Notes",
    reviewerNotesPlaceholder: "Optional — visible to the worker if rejected",

    // Actions
    reject: "Reject",
    approveAndRecord: "Approve & Record",
    cancel: "Cancel",

    // ---------- Request form dialog ----------
    addManualAttendance: "Add Manual Attendance",
    requestManualAttendance: "Request Manual Attendance",

    // Job selector
    selectJob: "Select a job...",
    noJobsAvailable: "No jobs available",
    loading: "Loading...",
    selectAJob: "Please select a job for this request.",

    // Worker selector
    worker: "Worker",
    selectWorker: "Select worker...",

    // Form fields
    requestType: "Request Type",
    selectWorkCenter: "Select work center...",
    checkInTime: "Check-in Time",
    checkOutTime: "Check-out Time",
    estimatedHours: "Estimated",
    reasonPlaceholder: "Explain why manual attendance is needed...",
    additionalNotes: "Additional Notes",
    optionalNotes: "Optional additional notes...",

    // Info messages
    directEntryInfo: "This entry will be recorded immediately.",
    requestInfo: "This request will be sent to your employer for review and approval.",

    // Submit buttons
    createEntry: "Create Entry",
    submitRequest: "Submit Request",

    // Notification banner (dashboard)
    pendingAttendanceRequests: "pending attendance request(s)",
    reviewNow: "Review now",

    // ---------- Permission settings panel ----------
    manualAttendanceSettings: "Manual Attendance Settings",
    enableManualAttendance: "Enable Manual Attendance",
    enableManualAttendanceDesc: "Allow manual attendance entries for jobs",
    whoCanCreate: "Who Can Create Requests",
    workersCanRequest: "Workers can request",
    employerCanCreate: "Employer can create",
    clientCanCreate: "Client can create",
    limits: "Limits",
    maxRetroactiveDays: "Max retroactive days",
    maxRequestsPerMonth: "Max requests/month/worker",
    requireReason: "Require reason",
    requireReasonDesc: "Workers must provide a reason for their request",
    saved: "Saved!",
    saveChanges: "Save Changes",
  },

  es: {
    // ---------- List page ----------
    myAttendanceRequests: "Mis solicitudes de asistencia",
    attendanceRequests: "Solicitudes de asistencia",
    myAttendanceRequestsDesc: "Consulta el estado de tus solicitudes manuales de asistencia",
    attendanceRequestsDesc: "Revisa y gestiona las solicitudes de asistencia de los trabajadores",
    newRequest: "Nueva solicitud",

    // Stat cards
    total: "Total",
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
    cancelled: "Cancelada",
    all: "Todas",

    // Request types
    fullDay: "Jornada completa",
    checkInOnly: "Solo entrada",
    checkOutOnly: "Solo salida",
    editExisting: "Editar existente",
    fullDayDesc: "Falta toda la jornada",
    checkInOnlyDesc: "Falta el fichaje de entrada",
    checkOutOnlyDesc: "Falta el fichaje de salida",
    editExistingDesc: "Corregir horarios",

    // Empty states
    noRequestsFound: "No se encontraron solicitudes",
    noRequestsFoundDesc:
      "Crea una solicitud de asistencia manual cuando necesites registrar un tiempo que no pudiste fichar.",
    noRequestsToReviewDesc: "No hay solicitudes de asistencia que coincidan con este filtro.",

    // Card fields
    date: "Fecha",
    times: "Horarios",
    job: "Trabajo",
    workCenter: "Centro de trabajo",
    unknownJob: "Trabajo desconocido",
    reason: "Motivo",
    submitted: "Enviada",
    approvedBy: "Aprobada por",
    employer: "Empresa",

    // Reviewer panel
    reviewNotes: "Notas de revisión",
    reviewerNotes: "Notas del revisor",
    reviewerNotesPlaceholder: "Opcional — visible para el trabajador si se rechaza",

    // Actions
    reject: "Rechazar",
    approveAndRecord: "Aprobar y registrar",
    cancel: "Cancelar",

    // ---------- Request form dialog ----------
    addManualAttendance: "Añadir asistencia manual",
    requestManualAttendance: "Solicitar asistencia manual",

    // Job selector
    selectJob: "Selecciona un trabajo...",
    noJobsAvailable: "No hay trabajos disponibles",
    loading: "Cargando...",
    selectAJob: "Selecciona un trabajo para esta solicitud.",

    // Worker selector
    worker: "Trabajador",
    selectWorker: "Selecciona un trabajador...",

    // Form fields
    requestType: "Tipo de solicitud",
    selectWorkCenter: "Selecciona un centro de trabajo...",
    checkInTime: "Hora de entrada",
    checkOutTime: "Hora de salida",
    estimatedHours: "Estimadas",
    reasonPlaceholder: "Explica por qué necesitas registrar asistencia manual...",
    additionalNotes: "Notas adicionales",
    optionalNotes: "Notas adicionales opcionales...",

    // Info messages
    directEntryInfo: "Esta entrada se registrará inmediatamente.",
    requestInfo: "Esta solicitud se enviará a tu empresa para su revisión y aprobación.",

    // Submit buttons
    createEntry: "Crear entrada",
    submitRequest: "Enviar solicitud",

    // Notification banner (dashboard)
    pendingAttendanceRequests: "solicitud(es) de asistencia pendiente(s)",
    reviewNow: "Revisar ahora",

    // ---------- Permission settings panel ----------
    manualAttendanceSettings: "Configuración de asistencia manual",
    enableManualAttendance: "Activar asistencia manual",
    enableManualAttendanceDesc: "Permitir entradas manuales de asistencia para trabajos",
    whoCanCreate: "Quién puede crear solicitudes",
    workersCanRequest: "Los trabajadores pueden solicitar",
    employerCanCreate: "La empresa puede crear",
    clientCanCreate: "El cliente puede crear",
    limits: "Límites",
    maxRetroactiveDays: "Máx. días retroactivos",
    maxRequestsPerMonth: "Máx. solicitudes/mes/trabajador",
    requireReason: "Requerir motivo",
    requireReasonDesc: "Los trabajadores deben indicar un motivo en su solicitud",
    saved: "¡Guardado!",
    saveChanges: "Guardar cambios",
  },
}

export default manualAttendanceTranslations
