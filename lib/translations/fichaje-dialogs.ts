const fichajeDialogsTranslations: Record<string, Record<string, string>> = {
  en: {
    // ---------- survey-fill-dialog ----------
    surveyFillClose: "Close",
    surveyFillPickRating: "Please select a rating.",
    surveyFillGiveReason: "Please give a reason.",
    surveyFillSendFailed: "Could not send",
    surveyFillThanks: "Thanks for your answer!",
    surveyFillRateQuestion: "Rate from 0 to 10",
    surveyFillNotSatisfied: "Not satisfied",
    surveyFillVerySatisfied: "Very satisfied",
    surveyFillReasonLabel: "Give a reason for your rating",
    surveyFillReasonPlaceholder: "Write the reason…",
    surveyFillCancel: "Cancel",
    surveyFillSending: "Sending…",
    surveyFillSend: "Send",

    // ---------- gps-consent-dialog ----------
    gpsConsentTitle: "Location consent",
    gpsConsentClose: "Close",
    gpsConsentIntroPre: "To register your clock-in we need to process your ",
    gpsConsentIntroBold: "geographic location",
    gpsConsentIntroPost:
      " at the moment of entry and exit. Before continuing, we want to inform you:",
    gpsConsentWhatLabel: "What we collect:",
    gpsConsentWhat:
      " the GPS coordinates (latitude and longitude) only at the instant of the clock-in. There is no continuous or background tracking.",
    gpsConsentWhyLabel: "Purpose:",
    gpsConsentWhy:
      " to verify that the clock-in is done at the workplace, in accordance with the legal time record.",
    gpsConsentLegalLabel: "Legal basis:",
    gpsConsentLegal:
      " your consent (art. 6.1.a GDPR) and compliance with the working-time record.",
    gpsConsentRetentionLabel: "Retention:",
    gpsConsentRetention:
      " it is stored together with the clock-in record for the applicable legal period and then deleted.",
    gpsConsentRightsLabel: "Your rights:",
    gpsConsentRights:
      " you can withdraw your consent at any time and exercise your rights of access, rectification and erasure. Withdrawing it may prevent location-based clock-in.",
    gpsConsentFooter:
      "By accepting, you confirm that you have read this information and consent to the processing of your location for the clock-in.",
    gpsConsentDecline: "Decline",
    gpsConsentSaving: "Saving…",
    gpsConsentAccept: "I accept",

    // ---------- location-help-dialog ----------
    locHelpTitle: "Location required",
    locHelpClose: "Close",
    locHelpHeadDenied: "Location permission is blocked",
    locHelpHeadInsecure: "Location needs a secure connection",
    locHelpHeadUnsupported: "Your browser does not allow location",
    locHelpHeadUnavailable: "Your location could not be obtained",
    locHelpHeadTimeout: "Location took too long",
    locHelpSubDenied:
      "To register your clock-in with location, enable it in the browser by following these steps:",
    locHelpSubInsecure:
      "Open the app with https:// to be able to register your location. In the meantime you can continue without it or use QR/IP.",
    locHelpSubUnsupported:
      "Try another browser, or continue without location / use QR or IP.",
    locHelpSubUnavailable:
      "Check that your device's GPS/location is enabled and try again.",
    locHelpSubTimeout:
      "Check your signal and try again, or continue without location.",
    locHelpStepsFirefox1: "Click the padlock icon to the left of the address.",
    locHelpStepsFirefox2: "Open “Secure connection” → “More information” → “Permissions”.",
    locHelpStepsFirefox3: "Under “Access your location”, remove the block and select Allow.",
    locHelpStepsFirefox4: "Reload the page and try again.",
    locHelpStepsChrome1: "Click the padlock icon 🔒 (or settings) to the left of the address.",
    locHelpStepsChrome2: "Look for “Location”.",
    locHelpStepsChrome3: "Change it to “Allow”.",
    locHelpStepsChrome4: "Reload the page and try again.",
    locHelpAltHelpPre: "Can't enable location? You can also clock in with ",
    locHelpAltHelpQr: "QR",
    locHelpAltHelpMid: " at the workplace or by ",
    locHelpAltHelpIp: "IP",
    locHelpAltHelpPost:
      ", or continue without location (the clock-in will be flagged for review).",
    locHelpContinueWithout: "Continue without location",
    locHelpChecking: "Checking…",
    locHelpRetry: "Retry",

    // ---------- privacy-section ----------
    privacyDateLocale: "en-GB",
    privacyTitle: "Privacy · Location",
    privacyClose: "Close",
    privacyRevokedTitle: "Consent withdrawn",
    privacyRevokedDesc: "You'll be asked again on your next location-based clock-in.",
    privacyGrantedTitle: "Consent granted",
    privacyGrantedDesc: "You allow the use of your location when clocking in",
    privacyGrantedSince: " · since ",
    privacyNoConsentTitle: "No location consent",
    privacyNoConsentDesc:
      "You'll be asked on your next location-based clock-in (web / GPS / QR).",
    privacyBullet1:
      "· Your location is only recorded at the moment of the clock-in (entry/exit). There is no continuous tracking.",
    privacyBullet2:
      "· Legal basis: your consent (art. 6.1.a GDPR). You can withdraw it at any time (art. 7.3).",
    privacyBullet3:
      "· If you withdraw it, location-based clock-in will ask for your consent again.",
    privacyRevoking: "Withdrawing…",
    privacyRevoke: "Withdraw consent",
  },
  es: {
    // ---------- survey-fill-dialog ----------
    surveyFillClose: "Cerrar",
    surveyFillPickRating: "Selecciona una valoración.",
    surveyFillGiveReason: "Indica el motivo.",
    surveyFillSendFailed: "No se pudo enviar",
    surveyFillThanks: "¡Gracias por tu respuesta!",
    surveyFillRateQuestion: "Valora del 0 al 10",
    surveyFillNotSatisfied: "Nada satisfecho",
    surveyFillVerySatisfied: "Muy satisfecho",
    surveyFillReasonLabel: "Indica el motivo de la valoración",
    surveyFillReasonPlaceholder: "Escribe el motivo…",
    surveyFillCancel: "Cancelar",
    surveyFillSending: "Enviando…",
    surveyFillSend: "Enviar",

    // ---------- gps-consent-dialog ----------
    gpsConsentTitle: "Consentimiento de ubicación",
    gpsConsentClose: "Cerrar",
    gpsConsentIntroPre: "Para registrar tu fichaje necesitamos tratar tu ",
    gpsConsentIntroBold: "ubicación geográfica",
    gpsConsentIntroPost:
      " en el momento de la entrada y salida. Antes de continuar, queremos informarte:",
    gpsConsentWhatLabel: "Qué recogemos:",
    gpsConsentWhat:
      " las coordenadas GPS (latitud y longitud) únicamente en el instante del fichaje. No hay seguimiento continuo ni en segundo plano.",
    gpsConsentWhyLabel: "Para qué:",
    gpsConsentWhy:
      " verificar que el fichaje se realiza en el centro de trabajo, conforme al registro horario legal.",
    gpsConsentLegalLabel: "Base legal:",
    gpsConsentLegal:
      " tu consentimiento (art. 6.1.a RGPD) y el cumplimiento del registro de jornada.",
    gpsConsentRetentionLabel: "Conservación:",
    gpsConsentRetention:
      " se guarda junto al registro de fichaje durante el plazo legal aplicable y luego se suprime.",
    gpsConsentRightsLabel: "Tus derechos:",
    gpsConsentRights:
      " puedes retirar el consentimiento en cualquier momento y ejercer tus derechos de acceso, rectificación y supresión. Retirarlo puede impedir el fichaje por ubicación.",
    gpsConsentFooter:
      "Al aceptar, confirmas que has leído esta información y consientes el tratamiento de tu ubicación para el fichaje.",
    gpsConsentDecline: "Rechazar",
    gpsConsentSaving: "Guardando…",
    gpsConsentAccept: "Acepto",

    // ---------- location-help-dialog ----------
    locHelpTitle: "Ubicación necesaria",
    locHelpClose: "Cerrar",
    locHelpHeadDenied: "El permiso de ubicación está bloqueado",
    locHelpHeadInsecure: "La ubicación necesita una conexión segura",
    locHelpHeadUnsupported: "Tu navegador no permite la ubicación",
    locHelpHeadUnavailable: "No se pudo obtener tu ubicación",
    locHelpHeadTimeout: "La ubicación tardó demasiado",
    locHelpSubDenied:
      "Para registrar tu fichaje con ubicación, actívala en el navegador siguiendo estos pasos:",
    locHelpSubInsecure:
      "Abre la aplicación con https:// para poder registrar tu ubicación. Mientras tanto puedes continuar sin ella o usar QR/IP.",
    locHelpSubUnsupported:
      "Prueba con otro navegador, o continúa sin ubicación / usa QR o IP.",
    locHelpSubUnavailable:
      "Revisa que el GPS/la ubicación del dispositivo estén activados e inténtalo de nuevo.",
    locHelpSubTimeout:
      "Comprueba tu señal e inténtalo de nuevo, o continúa sin ubicación.",
    locHelpStepsFirefox1: "Haz clic en el icono de candado a la izquierda de la dirección.",
    locHelpStepsFirefox2: "Abre «Conexión segura» → «Más información» → «Permisos».",
    locHelpStepsFirefox3: "En «Acceder a tu ubicación», quita el bloqueo y selecciona Permitir.",
    locHelpStepsFirefox4: "Recarga la página e inténtalo de nuevo.",
    locHelpStepsChrome1: "Haz clic en el icono de candado 🔒 (o de ajustes) a la izquierda de la dirección.",
    locHelpStepsChrome2: "Busca «Ubicación» / «Location».",
    locHelpStepsChrome3: "Cámbialo a «Permitir» / «Allow».",
    locHelpStepsChrome4: "Recarga la página e inténtalo de nuevo.",
    locHelpAltHelpPre: "¿No puedes activar la ubicación? También puedes fichar con ",
    locHelpAltHelpQr: "QR",
    locHelpAltHelpMid: " en el centro o por ",
    locHelpAltHelpIp: "IP",
    locHelpAltHelpPost:
      ", o continuar sin ubicación (el fichaje quedará marcado para revisión).",
    locHelpContinueWithout: "Continuar sin ubicación",
    locHelpChecking: "Comprobando…",
    locHelpRetry: "Reintentar",

    // ---------- privacy-section ----------
    privacyDateLocale: "es-ES",
    privacyTitle: "Privacidad · Ubicación",
    privacyClose: "Cerrar",
    privacyRevokedTitle: "Consentimiento retirado",
    privacyRevokedDesc: "Se te pedirá de nuevo en tu próximo fichaje con ubicación.",
    privacyGrantedTitle: "Consentimiento otorgado",
    privacyGrantedDesc: "Permites el uso de tu ubicación al fichar",
    privacyGrantedSince: " · desde el ",
    privacyNoConsentTitle: "Sin consentimiento de ubicación",
    privacyNoConsentDesc:
      "Se te pedirá en tu próximo fichaje con ubicación (web / GPS / QR).",
    privacyBullet1:
      "· Solo se registra tu ubicación en el momento del fichaje (entrada/salida). No hay seguimiento continuo.",
    privacyBullet2:
      "· Base legal: tu consentimiento (art. 6.1.a RGPD). Puedes retirarlo en cualquier momento (art. 7.3).",
    privacyBullet3:
      "· Si lo retiras, el fichaje por ubicación te pedirá de nuevo el consentimiento.",
    privacyRevoking: "Retirando…",
    privacyRevoke: "Retirar consentimiento",
  },
}

export default fichajeDialogsTranslations
