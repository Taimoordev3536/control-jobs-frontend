const impersonationTranslations = {
  en: {
    // Banner
    bannerText: "You are viewing as",
    bannerExit: "Exit",

    // Login button on data tabs
    loginAs: "Login",
    loginLoading: "Connecting...",

    // Toasts
    toastSuccess: "Opening impersonated session in a new tab...",
    toastError: "Failed to start impersonation",
    toastExpired: "Impersonation session expired",

    // Impersonate entry page
    pageLoading: "Setting up session...",
    pageLoadingSub: "Preparing the impersonated dashboard",
    pageErrorTitle: "Impersonation Failed",
    pageErrorNoToken: "No impersonation token was provided.",
    pageErrorInvalidToken: "The impersonation token is invalid or has expired.",
    pageErrorProfile: "Could not load the target user profile.",
    pageErrorGeneric: "Something went wrong while setting up the session.",
    pageCloseTab: "Close this tab",
    pageRetry: "Try again",
  },
  es: {
    // Banner
    bannerText: "Estas viendo como",
    bannerExit: "Salir",

    // Login button on data tabs
    loginAs: "Iniciar sesion",
    loginLoading: "Conectando...",

    // Toasts
    toastSuccess: "Abriendo sesion en una nueva pestana...",
    toastError: "Error al iniciar la suplantacion",
    toastExpired: "La sesion ha expirado",

    // Impersonate entry page
    pageLoading: "Preparando sesion...",
    pageLoadingSub: "Configurando el panel de control",
    pageErrorTitle: "Error de suplantacion",
    pageErrorNoToken: "No se proporciono un token de suplantacion.",
    pageErrorInvalidToken: "El token de suplantacion no es valido o ha expirado.",
    pageErrorProfile: "No se pudo cargar el perfil del usuario objetivo.",
    pageErrorGeneric: "Algo salio mal al configurar la sesion.",
    pageCloseTab: "Cerrar esta pestana",
    pageRetry: "Intentar de nuevo",
  },
}

export default impersonationTranslations
