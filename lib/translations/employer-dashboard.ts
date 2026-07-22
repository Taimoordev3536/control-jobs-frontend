const employerDashboardTranslations: Record<string, Record<string, string>> = {
  en: {
    // Header
    jobsManagement: "Jobs Management",
    manageWorkforceAssignments: "Manage workforce assignments",
    newJob: "New Job",
    searchJobs: "Search jobs...",

    // Stats Cards
    totalJobs: "Total Jobs",
    inProgressJobs: "In Progress Jobs",
    scheduledJobs: "Scheduled Jobs",
    completedJobs: "Completed Jobs",
    totalClients: "Total Clients",
    totalWorkers: "Total Workers",
    completionRate: "Completion Rate",
    avgRating: "Avg Rating",
    pendingJobs: "Pending Jobs",
    totalRevenue: "Total Revenue",
    monthlyGrowth: "Monthly Growth",

    // Filters
    filters: "Filters",
    status: "Status",
    occupation: "Occupation",
    workCenter: "Work Center",
    dateRange: "Date Range",
    allStatuses: "All Statuses",
    allOccupations: "All Occupations",
    allWorkCenters: "All Work Centers",
    allDates: "All Dates",
    today: "Today",
    thisWeek: "This Week",
    thisMonth: "This Month",

    // Job Status
    inProgress: "In Progress",
    activeSession: "Active session",
    extra: "Extra",
    method: "Method",
    punctuality: "Punctuality",
    early: "Early",
    onTime: "On time",
    late: "Late",
    scheduled: "Scheduled",
    completed: "Completed",
    paused: "Paused",
    active: "Active",
    pending: "Pending",
    cancelled: "Cancelled",
    onHold: "On Hold",

    // Job Information
    client: "Client",
    location: "Location",
    duration: "Duration",
    expectedHours: "Expected Hours",
    worker: "Worker",
    workers: "Workers",
    shifts: "Shifts",
    tasks: "Tasks",
    signings: "Signings",
    surveys: "Surveys",
    day: "day",
    days: "days",
    hours: "hours",
    hour: "h",
    minutes: "min",

  // Schedule types
  free: "Free",
  seasonal: "Seasonal",
  normal: "Normal",
  summer: "Summer",
  clearSchedules: "Clear Schedules",

    // Actions
    records: "Records",
    details: "Details",
    view: "View",
    edit: "Edit",
    editJob: "Edit Job",
    analytics: "Analytics",
    delete: "Delete",
    duplicate: "Duplicate",
    assign: "Assign",
    reassign: "Reassign",
    cancel: "Cancel",
    resume: "Resume",
    complete: "Complete",

    // Occupations
    cleaning: "Cleaning",
    security: "Security",
    maintenance: "Maintenance",
    delivery: "Delivery",
    itSupport: "IT Support",
    landscaping: "Landscaping",
    general: "General",

    // Empty States
    noJobsFound: "No Jobs Found",
    noJobsMatchFilters: "No jobs match your current search criteria. Try adjusting your filters or search terms.",
    clearAllFilters: "Clear All Filters",
    noJobsCreated: "No jobs have been created yet.",
    createFirstJob: "Create your first job to get started.",

    // Loading States
    loadingJobs: "Loading jobs...",
    processingRequest: "Processing request...",
    savingChanges: "Saving changes...",

    // Error States
    errorLoadingJobs: "Error Loading Jobs",
    failedToLoadJobs: "Failed to load jobs. Please try again.",
    tryAgain: "Try Again",
    errorOccurred: "An error occurred",
    networkError: "Network error. Please check your connection.",
    unauthorized: "Unauthorized access. Please log in again.",

    // Success Messages
    jobCreated: "Job created successfully",
    jobCreatedSuccessfully: "Job created successfully!",
    jobUpdated: "Job updated successfully",
    jobUpdatedSuccessfully: "Job updated successfully!",
    jobDeleted: "Job deleted successfully",
    jobDeletedSuccessfully: "Job deleted successfully!",
    jobAssigned: "Job assigned successfully",
    changesSaved: "Changes saved successfully",

    // Confirmation Messages
    confirmDelete: "Are you sure you want to delete this job?",
    confirmDeleteJob: "Are you sure you want to delete this job? This action cannot be undone.",
    confirmCancel: "Are you sure you want to cancel this job?",
    confirmComplete: "Mark this job as completed?",
    deleteWarning: "This action cannot be undone.",

    // Error Messages
    errorDeletingJob: "Error deleting job",

    // Time and Date
    startDate: "Start Date",
    endDate: "End Date",
    createdDate: "Created Date",
    lastUpdated: "Last Updated",
    deadline: "Deadline",
    estimatedTime: "Estimated Time",
    actualTime: "Actual Time",

    // Job Details
    jobDetails: "Job Details",
    jobDescription: "Job Description",
    requirements: "Requirements",
    instructions: "Instructions",
    priority: "Priority",
    high: "High",
    medium: "Medium",
    low: "Low",

    // Worker Management
    assignWorkers: "Assign Workers",
    availableWorkers: "Available Workers",
    assignedWorkers: "Assigned Workers",
    workerCount: "Worker Count",
    selectWorkers: "Select Workers",
    removeWorker: "Remove Worker",
    addWorker: "Add Worker",

    // Notifications
    newJobAssigned: "New job assigned",
    jobStatusChanged: "Job status changed",
    workerAssigned: "Worker assigned to job",
    deadlineApproaching: "Deadline approaching",
    jobOverdue: "Job is overdue",

    // Navigation
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    save: "Save",
    saveChanges: "Save Changes",
    update: "Update",
    confirm: "Confirm",
    apply: "Apply",
    reset: "Reset",

    // Sorting
    sortBy: "Sort by",
    sortByDate: "Sort by Date",
    sortByStatus: "Sort by Status",
    sortByPriority: "Sort by Priority",
    sortByClient: "Sort by Client",
    ascending: "Ascending",
    descending: "Descending",

    // Export and Reports
    export: "Export",
    exportJobs: "Export Jobs",
    generateReport: "Generate Report",
    downloadReport: "Download Report",
    printReport: "Print Report",

    // Bulk Actions
    bulkActions: "Bulk Actions",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    selectedItems: "Selected Items",
    bulkDelete: "Bulk Delete",
    bulkAssign: "Bulk Assign",
    bulkStatusChange: "Bulk Status Change",

    // Settings
    settings: "Settings",
    preferences: "Preferences",
    notifications: "Notifications",
    permissions: "Permissions",
    profile: "Profile",

    // Help and Support
    help: "Help",
    support: "Support",
    documentation: "Documentation",
    contactSupport: "Contact Support",
    userGuide: "User Guide",
    faq: "FAQ",

    // Miscellaneous
    loading: "Loading",
    refresh: "Refresh",
    search: "Search",
    filter: "Filter",
    clear: "Clear",
    show: "Show",
    hide: "Hide",
    expand: "Expand",
    collapse: "Collapse",
    more: "More",
    less: "Less",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    ok: "OK",

    // Task Messages
    taskAdded: "Task Added",
    taskAddedDescription: "Task has been added to the list",
    taskUpdated: "Task Updated",
    taskUpdatedDescription: "Task has been updated successfully",

    // Days of the week
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",

    // Validation Messages
    thisFieldIsRequired: "This field is required",
    requiredFieldsMissing: "Required Fields Missing",
    pleaseCompleteAllRequiredFields: "All task fields are required. Please fill in any missing fields.",
    taskRequired: "Task Required",
    taskRequiredDescription: "Please enter a task name",

    // Records Page
    recordsTitle: "Entry Records",
    checkInCheckOut: "Check In - Check Out",
    titular: "Titular",
    job: "Job",
    trabajador: "Worker",
    entrada: "Entry",
    salida: "Exit",
    total: "Total",
    alertas: "Alerts",
    exportExcel: "Export Excel",
    exportCSV: "Export CSV",
    exportPDF: "Export PDF",
    noRecordsFound: "No records found",

    // Manual attendance
    addManualAttendance: "Add Manual Attendance",
    pendingAttendanceRequests: "pending attendance request(s)",
    reviewNow: "Review Now",

    // Rate change banner
    upcomingRateChange: "Your tariff is changing",
    upcomingRateChangeBody: "From",
    fixedFee: "Fixed fee",
    perWorkCenter: "Per work center",
    perWorker: "Per worker",
    viewBilling: "View billing",
    cancel: "Cancel",
  },
  es: {
    // Header viewAttendance 
    jobsManagement: "Gestión de Trabajos",
    manageWorkforceAssignments: "Gestionar asignaciones de personal",
    newJob: "Nuevo Trabajo",
    searchJobs: "Buscar trabajos...",

    // Stats Cards
    totalJobs: "Total de Trabajos",
    inProgressJobs: "Trabajos en Progreso",
    scheduledJobs: "Trabajos Programados",
    completedJobs: "Trabajos Completados",
    totalClients: "Total de Clientes",
    totalWorkers: "Total de Trabajadores",
    completionRate: "Tasa de Finalización",
    avgRating: "Calificación Promedio",
    pendingJobs: "Trabajos Pendientes",
    totalRevenue: "Ingresos Totales",
    monthlyGrowth: "Crecimiento Mensual",

    // Filters
    filters: "Filtros",
    status: "Estado",
    occupation: "Ocupación",
    workCenter: "Centro de Trabajo",
    dateRange: "Rango de Fechas",
    allStatuses: "Todos los Estados",
    allOccupations: "Todas las Ocupaciones",
    allWorkCenters: "Todos los Centros",
    allDates: "Todas las Fechas",
    today: "Hoy",
    thisWeek: "Esta Semana",
    thisMonth: "Este Mes",

    // Job Status
    inProgress: "En Progreso",
    activeSession: "Sesión activa",
    extra: "Extra",
    method: "Método",
    punctuality: "Puntualidad",
    early: "Anticipado",
    onTime: "A tiempo",
    late: "Tarde",
    scheduled: "Programado",
    completed: "Completado",
    paused: "Pausado",
    active: "Activo",
    pending: "Pendiente",
    cancelled: "Cancelado",
    onHold: "En Espera",

    // Job Information
    client: "Cliente",
    location: "Ubicación",
    duration: "Duración",
    expectedHours: "Horas Esperadas",
    worker: "Trabajador",
    workers: "Trabajadores",
    shifts: "Turnos",
    tasks: "Tareas",
    signings: "Fichajes",
    surveys: "Encuestas",
    day: "día",
    days: "días",
    hours: "horas",
    hour: "h",
    minutes: "min",

  // Schedule types
  free: "Libre",
  seasonal: "Estacional",
  normal: "Habitual",
  summer: "Verano",
  clearSchedules: "Borrar horarios",

    // Actions
    records: "Registros",
    details: "Detalles",
    view: "Ver",
    edit: "Editar",
    editJob: "Editar Job",
    analytics: "Análisis",
    delete: "Eliminar",
    duplicate: "Duplicar",
    assign: "Asignar",
    reassign: "Reasignar",
    cancel: "Cancelar",
    resume: "Reanudar",
    complete: "Completar",

    // Occupations
    cleaning: "Limpieza",
    security: "Seguridad",
    maintenance: "Mantenimiento",
    delivery: "Entrega",
    itSupport: "Soporte IT",
    landscaping: "Jardinería",
    general: "General",

    // Empty States
    noJobsFound: "No se Encontraron Trabajos",
    noJobsMatchFilters:
      "Ningún trabajo coincide con sus criterios de búsqueda actuales. Intente ajustar sus filtros o términos de búsqueda.",
    clearAllFilters: "Limpiar Todos los Filtros",
    noJobsCreated: "Aún no se han creado trabajos.",
    createFirstJob: "Cree su primer trabajo para comenzar.",

    // Loading States
    loadingJobs: "Cargando trabajos...",
    processingRequest: "Procesando solicitud...",
    savingChanges: "Guardando cambios...",

    // Error States
    errorLoadingJobs: "Error al Cargar Trabajos",
    failedToLoadJobs: "Error al cargar trabajos. Por favor, inténtelo de nuevo.",
    tryAgain: "Intentar de Nuevo",
    errorOccurred: "Ocurrió un error",
    networkError: "Error de red. Por favor, verifique su conexión.",
    unauthorized: "Acceso no autorizado. Por favor, inicie sesión nuevamente.",

    // Success Messages
    jobCreated: "Trabajo creado exitosamente",
    jobCreatedSuccessfully: "Trabajo creado satisfactoriamente!",
    jobUpdated: "Trabajo actualizado exitosamente",
    jobUpdatedSuccessfully: "Job actualizado satisfactoriamente",
    jobDeleted: "Trabajo eliminado exitosamente",
    jobDeletedSuccessfully: "Trabajo eliminado satisfactoriamente!",
    jobAssigned: "Trabajo asignado exitosamente",
    changesSaved: "Cambios guardados exitosamente",

    // Confirmation Messages
    confirmDelete: "¿Está seguro de que desea eliminar este trabajo?",
    confirmDeleteJob: "¿Está seguro de que desea eliminar este job? Esta acción no se puede deshacer.",
    confirmCancel: "¿Está seguro de que desea cancelar este trabajo?",
    confirmComplete: "¿Marcar este trabajo como completado?",
    deleteWarning: "Esta acción no se puede deshacer.",

    // Error Messages
    errorDeletingJob: "Error al eliminar el job",

    // Time and Date
    startDate: "Fecha de Inicio",
    endDate: "Fecha de Fin",
    createdDate: "Fecha de Creación",
    lastUpdated: "Última Actualización",
    deadline: "Fecha Límite",
    estimatedTime: "Tiempo Estimado",
    actualTime: "Tiempo Real",

    // Job Details
    jobDetails: "Detalles del Trabajo",
    jobDescription: "Descripción del Trabajo",
    requirements: "Requisitos",
    instructions: "Instrucciones",
    priority: "Prioridad",
    high: "Alta",
    medium: "Media",
    low: "Baja",

    // Worker Management
    assignWorkers: "Asignar Trabajadores",
    availableWorkers: "Trabajadores Disponibles",
    assignedWorkers: "Trabajadores Asignados",
    workerCount: "Cantidad de Trabajadores",
    selectWorkers: "Seleccionar Trabajadores",
    removeWorker: "Remover Trabajador",
    addWorker: "Agregar Trabajador",

    // Notifications
    newJobAssigned: "Nuevo trabajo asignado",
    jobStatusChanged: "Estado del trabajo cambiado",
    workerAssigned: "Trabajador asignado al trabajo",
    deadlineApproaching: "Fecha límite próxima",
    jobOverdue: "Trabajo atrasado",

    // Navigation
    back: "Atrás",
    next: "Siguiente",
    previous: "Anterior",
    close: "Cerrar",
    save: "Guardar",
    saveChanges: "Guardar Cambios",
    update: "Actualizar",
    confirm: "Confirmar",
    apply: "Aplicar",
    reset: "Restablecer",

    // Sorting
    sortBy: "Ordenar por",
    sortByDate: "Ordenar por Fecha",
    sortByStatus: "Ordenar por Estado",
    sortByPriority: "Ordenar por Prioridad",
    sortByClient: "Ordenar por Cliente",
    ascending: "Ascendente",
    descending: "Descendente",

    // Export and Reports
    export: "Exportar",
    exportJobs: "Exportar Trabajos",
    generateReport: "Generar Informe",
    downloadReport: "Descargar Informe",
    printReport: "Imprimir Informe",

    // Bulk Actions
    bulkActions: "Acciones en Lote",
    selectAll: "Seleccionar Todo",
    deselectAll: "Deseleccionar Todo",
    selectedItems: "Elementos Seleccionados",
    bulkDelete: "Eliminación en Lote",
    bulkAssign: "Asignación en Lote",
    bulkStatusChange: "Cambio de Estado en Lote",

    // Settings
    settings: "Configuración",
    preferences: "Preferencias",
    notifications: "Notificaciones",
    permissions: "Permisos",
    profile: "Perfil",

    // Help and Support
    help: "Ayuda",
    support: "Soporte",
    documentation: "Documentación",
    contactSupport: "Contactar Soporte",
    userGuide: "Guía del Usuario",
    faq: "Preguntas Frecuentes",

    // Miscellaneous
    loading: "Cargando",
    refresh: "Actualizar",
    search: "Buscar",
    filter: "Filtrar",
    clear: "Limpiar",
    show: "Mostrar",
    hide: "Ocultar",
    expand: "Expandir",
    collapse: "Contraer",
    more: "Más",
    less: "Menos",
    all: "Todo",
    none: "Ninguno",
    yes: "Sí",
    no: "No",
    ok: "OK",

    // Task Messages
    taskAdded: "Tarea añadida",
    taskAddedDescription: "La tarea ha sido añadida a la lista",
    taskUpdated: "Tarea actualizada",
    taskUpdatedDescription: "La tarea ha sido actualizada correctamente",

    // Days of the week
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",

    // Validation Messages
    thisFieldIsRequired: "Este campo es obligatorio",
    requiredFieldsMissing: "Faltan campos obligatorios",
    pleaseCompleteAllRequiredFields: "Todos los campos de la tarea son obligatorios. Por favor, complete los que falten.",
    taskRequired: "Tarea requerida",
    taskRequiredDescription: "Por favor ingrese un nombre de tarea",

    // Records Page
    recordsTitle: "Registros de Entrada",
    checkInCheckOut: "Check In - Check Out",
    titular: "Titular",
    job: "Job",
    trabajador: "Trabajador",
    entrada: "Entrada",
    salida: "Salida",
    total: "Total",
    alertas: "Alertas",
    exportExcel: "Exportar Excel",
    exportCSV: "Exportar CSV",
    exportPDF: "Exportar PDF",
    noRecordsFound: "No se encontraron registros",

    // Manual attendance
    addManualAttendance: "Añadir asistencia manual",
    pendingAttendanceRequests: "solicitud(es) de asistencia pendiente(s)",
    reviewNow: "Revisar ahora",

    // Aviso de cambio de tarifa
    upcomingRateChange: "Tu tarifa va a cambiar",
    upcomingRateChangeBody: "Desde el",
    fixedFee: "Cuota fija",
    perWorkCenter: "Por centro de trabajo",
    perWorker: "Por trabajador",
    viewBilling: "Ver facturación",
    cancel: "Cancelar",
  },
}

export default employerDashboardTranslations
