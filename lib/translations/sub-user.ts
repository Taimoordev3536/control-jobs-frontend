const subUserTranslations = {
  en: {
    // Users list page
    pageTitle: "Users",
    pageSubtitle: "Manage team members who can access your account",
    addSubUser: "Add Member",
    filter: "Filter",
    noSubUsers: "No members yet. Click + to invite your first team member.",
    emptyFiltered: "No matches. Try changing your filters.",

    // Table columns
    colName: "Name",
    colEmail: "Email",
    colPermission: "Permission",
    colStatus: "Status",
    colInviteLink: "Invite link",

    // Badges — permission
    permissionEdit: "Edit",
    permissionViewOnly: "View only",

    // Badges — status
    statusActive: "Active",
    statusPending: "Pending",
    statusInactive: "Inactive",

    // Main user label
    mainUserLabel: "You (Owner)",

    // Row actions menu
    actionEditPermission: "Edit permission",
    actionResendInvite: "Resend invite",
    actionResetPassword: "Reset password",
    actionDeactivate: "Deactivate",
    actionReactivate: "Reactivate",
    actionRemove: "Remove",

    // Create modal
    createTitle: "New Member",
    createSubtitle: "Invite a team member to access your account",
    firstNameLabel: "First name",
    lastNameLabel: "Last name",
    emailLabel: "Email",
    emailPlaceholder: "example@email.com",
    permissionLevelLabel: "Permission level",
    editOptionTitle: "Edit",
    editOptionDesc: "Full access — can create, update, and delete",
    viewOnlyOptionTitle: "View only",
    viewOnlyOptionDesc: "Read-only — cannot make changes",
    inviteLinkNotice: "An invite link will be generated and copied to your clipboard.",
    cancel: "Cancel",
    sendInvite: "Send invite",
    sending: "Sending…",

    // Edit permission modal
    editPermissionTitle: "Change permission",
    save: "Save",
    saving: "Saving…",

    // Confirmations
    deactivateTitle: "Deactivate {{name}}?",
    deactivateDesc: "They will lose access immediately but can be reactivated later.",
    deactivateCta: "Deactivate",
    reactivateTitle: "Reactivate {{name}}?",
    reactivateDesc: "They will regain access with their previous permission.",
    reactivateCta: "Reactivate",
    removeTitle: "Remove {{name}}?",
    removeDesc: "They will no longer be able to log in. You can invite them again later.",
    removeCta: "Remove",
    resetTitle: "Send new invite to {{email}}?",
    resetDesc: "A new invite link will be generated and copied to your clipboard. Their current password will stop working.",
    resetCta: "Generate link",
    working: "Working…",

    // Toast messages
    toastLoadFailed: "Failed to load members",
    toastCreateFailed: "Failed to create member",
    toastUpdateFailed: "Failed to update",
    toastActionFailed: "Action failed",
    toastFillRequired: "Fill in all required fields",
    toastInviteCopied: "Invite link copied",
    toastCopyFailed: "Copy failed",
    toastSubUserInvited: "Member invited",
    toastSubUserInvitedDesc: "Invite link copied to clipboard. Send it to them to set their password.",
    toastPermissionUpdated: "Permission updated",
    toastDone: "Done",
    toastNewInviteGenerated: "New invite link generated",
    toastNewInviteDesc: "Copied to clipboard. Send it to them to set a new password.",

    // Validation
    fieldRequired: "This field is required",
    invalidEmail: "Invalid email format",

    // Accept invitation page
    acceptTitle: "Accept invitation",
    acceptSubtitle: "Set a password to activate your account",
    newPasswordPlaceholder: "New password",
    confirmPasswordPlaceholder: "Confirm password",
    passwordHint: "Minimum 8 characters.",
    setPasswordButton: "Set password",
    setPasswordSaving: "Saving…",
    toastMissingToken: "Missing invite token",
    toastPasswordTooShort: "Password must be at least 8 characters",
    toastPasswordsDontMatch: "Passwords do not match",
    toastPasswordSet: "Password set",
    toastPasswordSetDesc: "You can now log in.",
    toastAcceptFailed: "Failed to accept invite",
  },
  es: {
    // Users list page
    pageTitle: "Usuarios",
    pageSubtitle: "Gestiona los miembros del equipo que pueden acceder a tu cuenta",
    addSubUser: "Añadir miembro",
    filter: "Filtrar",
    noSubUsers: "Aún no hay miembros. Haz clic en + para invitar al primer miembro.",
    emptyFiltered: "Sin resultados. Prueba a cambiar los filtros.",

    // Table columns
    colName: "Nombre",
    colEmail: "Email",
    colPermission: "Permiso",
    colStatus: "Estado",
    colInviteLink: "Enlace de invitación",

    // Badges — permission
    permissionEdit: "Edición",
    permissionViewOnly: "Solo lectura",

    // Badges — status
    statusActive: "Activo",
    statusPending: "Pendiente",
    statusInactive: "Inactivo",

    // Main user label
    mainUserLabel: "Tú (Propietario)",

    // Row actions menu
    actionEditPermission: "Editar permiso",
    actionResendInvite: "Reenviar invitación",
    actionResetPassword: "Restablecer contraseña",
    actionDeactivate: "Desactivar",
    actionReactivate: "Reactivar",
    actionRemove: "Eliminar",

    // Create modal
    createTitle: "Nuevo miembro",
    createSubtitle: "Invita a un miembro del equipo a acceder a tu cuenta",
    firstNameLabel: "Nombre",
    lastNameLabel: "Apellido",
    emailLabel: "Email",
    emailPlaceholder: "ejemplo@correo.com",
    permissionLevelLabel: "Nivel de permiso",
    editOptionTitle: "Edición",
    editOptionDesc: "Acceso completo — puede crear, actualizar y eliminar",
    viewOnlyOptionTitle: "Solo lectura",
    viewOnlyOptionDesc: "Solo visualización — no puede hacer cambios",
    inviteLinkNotice: "Se generará un enlace de invitación y se copiará al portapapeles.",
    cancel: "Cancelar",
    sendInvite: "Enviar invitación",
    sending: "Enviando…",

    // Edit permission modal
    editPermissionTitle: "Cambiar permiso",
    save: "Guardar",
    saving: "Guardando…",

    // Confirmations
    deactivateTitle: "¿Desactivar a {{name}}?",
    deactivateDesc: "Perderá el acceso de inmediato pero podrá ser reactivado más tarde.",
    deactivateCta: "Desactivar",
    reactivateTitle: "¿Reactivar a {{name}}?",
    reactivateDesc: "Recuperará el acceso con su permiso anterior.",
    reactivateCta: "Reactivar",
    removeTitle: "¿Eliminar a {{name}}?",
    removeDesc: "Ya no podrá iniciar sesión. Puedes volver a invitarlo más tarde.",
    removeCta: "Eliminar",
    resetTitle: "¿Enviar nueva invitación a {{email}}?",
    resetDesc: "Se generará un nuevo enlace de invitación y se copiará al portapapeles. Su contraseña actual dejará de funcionar.",
    resetCta: "Generar enlace",
    working: "Procesando…",

    // Toast messages
    toastLoadFailed: "No se pudieron cargar los miembros",
    toastCreateFailed: "No se pudo crear el miembro",
    toastUpdateFailed: "No se pudo actualizar",
    toastActionFailed: "Acción fallida",
    toastFillRequired: "Rellena todos los campos obligatorios",
    toastInviteCopied: "Enlace de invitación copiado",
    toastCopyFailed: "Error al copiar",
    toastSubUserInvited: "Miembro invitado",
    toastSubUserInvitedDesc: "Enlace de invitación copiado al portapapeles. Envíaselo para que establezca su contraseña.",
    toastPermissionUpdated: "Permiso actualizado",
    toastDone: "Hecho",
    toastNewInviteGenerated: "Nuevo enlace de invitación generado",
    toastNewInviteDesc: "Copiado al portapapeles. Envíaselo para que establezca una nueva contraseña.",

    // Validation
    fieldRequired: "Este campo es obligatorio",
    invalidEmail: "Formato de email inválido",

    // Accept invitation page
    acceptTitle: "Aceptar invitación",
    acceptSubtitle: "Establece una contraseña para activar tu cuenta",
    newPasswordPlaceholder: "Nueva contraseña",
    confirmPasswordPlaceholder: "Confirmar contraseña",
    passwordHint: "Mínimo 8 caracteres.",
    setPasswordButton: "Establecer contraseña",
    setPasswordSaving: "Guardando…",
    toastMissingToken: "Falta el token de invitación",
    toastPasswordTooShort: "La contraseña debe tener al menos 8 caracteres",
    toastPasswordsDontMatch: "Las contraseñas no coinciden",
    toastPasswordSet: "Contraseña establecida",
    toastPasswordSetDesc: "Ya puedes iniciar sesión.",
    toastAcceptFailed: "No se pudo aceptar la invitación",
  },
}

export default subUserTranslations
