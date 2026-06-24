// ============================================================
// PROJECT CONTROL CENTER — Code.gs
// Entry points y router. Sin lógica de negocio. (apps_script_standards §3-4)
// Contrato de respuesta: { ok:true, data } / { ok:false, error, code }
// ============================================================

// ── doGet — solo health check ─────────────────────────────────
function doGet(e) {
  const accion = e && e.parameter ? e.parameter.accion : '';
  if (accion === 'health') {
    return jsonResponse_({ ok: true, status: 'running', timestamp: new Date().toISOString() });
  }
  return errorResponse_('Acción no permitida por GET', 400);
}

// ── doPost — entry point principal ────────────────────────────
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return errorResponse_('JSON inválido', 400);
  }

  const action = body.action;

  try {
    // 1) Acciones públicas (sin sesión).
    if (action === 'login')      return jsonResponse_(login_(body));
    if (action === 'logout')     return jsonResponse_(logout_(body));
    if (action === 'checkSetup') return jsonResponse_(checkSetup_());

    // 2) A partir de acá se requiere sesión válida.
    const ses = validateSessionToken_(body.session_token);
    if (!ses.ok) return errorResponse_(ses.error, 401);
    const user = { id_usuario: ses.id_usuario, email: ses.email, id_rol: ses.id_rol };

    if (action === 'validateSession') return jsonResponse_(validateSession_(body));
    if (action === 'changePassword')  return jsonResponse_(changePassword_(body, user));

    const params = body.params || {};
    const result = routePost_(action, params, user, body);
    return jsonResponse_(result);

  } catch (err) {
    // Errores esperados (validación / negocio) vuelven con su code; no se loguean.
    if (err && err.expected) return errorResponse_(err.message, err.code || 400);
    if (err && err.code === 403) return errorResponse_(err.message, 403);
    if (err && /no encontrad/i.test(err.message || '')) return errorResponse_(err.message, 404);
    // Inesperados: loguear y devolver mensaje genérico.
    writeError_(action || 'doPost', err.message, err.stack, '');
    return errorResponse_('Error interno del servidor', 500);
  }
}

// ── Router ────────────────────────────────────────────────────
function routePost_(action, params, user, body) {
  // Solo lectura — cualquier usuario autenticado.
  if (action === 'getProyectos')    return getProyectos_(params);
  if (action === 'getProyectoById') return getProyectoById_(params);
  if (action === 'getTareas')       return getTareas_(params);
  if (action === 'getResumen')      return getResumen_();
  if (action === 'getCatalogos')    return getCatalogos_();
  if (action === 'getComentarios')  return getComentarios_(params);
  if (action === 'getHistorial')    return getHistorial_(params);
  if (action === 'getAdjuntos')     return getAdjuntos_(params);
  if (action === 'getChecklist')    return getChecklist_(params);
  if (action === 'getUsuariosBasico') return getUsuariosBasico_();
  if (action === 'getPermisos')     return getPermisos_();

  // Colaboración — cualquier usuario autenticado puede comentar y adjuntar.
  if (action === 'createComentario') return createComentario_(params, user);
  if (action === 'createAdjunto')    return createAdjunto_(params, user);

  // Escritura y administración — solo Admin.
  requireAdmin_(user);

  if (action === 'deleteAdjunto')  return deleteAdjunto_(params, user);

  if (action === 'createChecklistItem') return createChecklistItem_(params, user);
  if (action === 'toggleChecklistItem') return toggleChecklistItem_(params, user);
  if (action === 'deleteChecklistItem') return deleteChecklistItem_(params, user);

  if (action === 'createProyecto') return createProyecto_(params, user);
  if (action === 'updateProyecto') return updateProyecto_(params, user);
  if (action === 'deleteProyecto') return deleteProyecto_(params, user);

  if (action === 'createTarea')    return createTarea_(params, user);
  if (action === 'updateTarea')    return updateTarea_(params, user);
  if (action === 'deleteTarea')    return deleteTarea_(params, user);

  if (action === 'getUsuarios')    return getUsuarios_();
  if (action === 'createUsuario')  return createUsuario_(params, user);
  if (action === 'updateUsuario')  return updateUsuario_(params, user);

  if (action === 'updatePermisos') return updatePermisos_(params, user);

  return { ok: false, error: 'Acción desconocida: ' + action, code: 400 };
}

// ── Test manual desde el editor (apps_script_standards §13) ───
function _testDoPost() {
  const fake = { postData: { contents: JSON.stringify({ action: 'checkSetup' }) } };
  Logger.log(doPost(fake).getContent());
}
