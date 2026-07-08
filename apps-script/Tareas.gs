// ============================================================
// PROJECT CONTROL CENTER — Tareas.gs
// CRUD de la hoja TAREAS. Relación: id_proyecto → PROYECTOS.id
// ============================================================

// ── LISTAR ────────────────────────────────────────────────────
function getTareas_(params) {
  params = params || {};
  let rows = getAllRows_(SHEETS.TAREAS, TAREAS_COLS);
  const today = _todayStr_();

  rows.forEach(function(t) {
    t.vencida = (ESTADOS_TAREA_CERRADOS.indexOf(t.estado) === -1)
      && t.fecha_limite && String(t.fecha_limite).slice(0, 10) < today;
  });

  if (params.id_proyecto) {
    const pid = validateId_(params.id_proyecto, 'id_proyecto');
    rows = rows.filter(function(t) { return Number(t.id_proyecto) === pid; });
  }
  if (params.estado)      rows = rows.filter(function(t) { return t.estado === params.estado; });
  if (params.tipo)        rows = rows.filter(function(t) { return t.tipo === params.tipo; });
  if (params.responsable) rows = rows.filter(function(t) { return t.responsable === params.responsable; });
  if (params.incluir_canceladas !== true) rows = rows.filter(function(t) { return t.estado !== 'Cancelada'; });
  // Sprint: id_sprint=<id> filtra por sprint puntual; id_sprint='backlog' filtra tareas sin sprint asignado.
  if (params.id_sprint === 'backlog') {
    rows = rows.filter(function(t) { return !t.id_sprint; });
  } else if (params.id_sprint) {
    const sid = validateId_(params.id_sprint, 'id_sprint');
    rows = rows.filter(function(t) { return Number(t.id_sprint) === sid; });
  }

  rows.sort(function(a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
  return { ok: true, data: rows };
}

// ── CREAR ─────────────────────────────────────────────────────
function createTarea_(params, user) {
  const idProyecto = validateId_(params.id_proyecto, 'id_proyecto');
  if (!findRowNumber_(getSheet_(SHEETS.PROYECTOS), idProyecto)) {
    return { ok: false, error: 'El proyecto asociado no existe', code: 404 };
  }
  const titulo    = validateString_(params.titulo, 'titulo', 200);
  const tipo      = optionalEnum_(params.tipo, 'tipo', getCatCached_(SHEETS.CAT_TIPOS_TAREA, TIPOS_TAREA), 'Tarea');
  const estado    = optionalEnum_(params.estado, 'estado', getCatCached_(SHEETS.CAT_ESTADOS_TAREA, ESTADOS_TAREA), 'Por Hacer');
  const prioridad = optionalEnum_(params.prioridad, 'prioridad', getCatCached_(SHEETS.CAT_PRIORIDADES, PRIORIDADES), 'Medium');
  const descripcion = optionalString_(params.descripcion, 'descripcion', 4000);
  const responsable = optionalString_(params.responsable, 'responsable', 120);
  const fechaInicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  const fechaLimite = optionalDate_(params.fecha_limite, 'fecha_limite');
  const avance = params.avance_pct !== undefined ? _clampPct_(params.avance_pct) : 0;
  const orden  = params.orden !== undefined ? (parseInt(params.orden, 10) || 0) : 0;
  // S6: dimensiones y enlaces externos.
  const area    = optionalEnum_(params.area, 'area', getCatCached_(SHEETS.CAT_AREAS, AREAS), '');
  const tienda  = optionalEnum_(params.tienda, 'tienda', TIENDAS, '');
  const urlJira    = optionalUrl_(params.url_jira, 'url_jira');
  const urlGitlab  = optionalUrl_(params.url_gitlab, 'url_gitlab');
  const urlFigmaP  = optionalUrl_(params.url_figma_prototipo, 'url_figma_prototipo');
  const urlFigmaE  = optionalUrl_(params.url_figma_editable, 'url_figma_editable');
  const urlInforme = optionalUrl_(params.url_informe_gestion, 'url_informe_gestion');
  // Sprint (global, opcional). Verifica existencia para evitar FK rota.
  const idSprint = params.id_sprint ? validateId_(params.id_sprint, 'id_sprint') : '';
  if (idSprint && !findRowNumber_(getSheet_(SHEETS.SPRINTS), idSprint)) {
    return { ok: false, error: 'Sprint no encontrado', code: 404 };
  }
  // Dimensiones reutilizables (Informe de Gestion / Requerimiento).
  const seccion = optionalEnumList_(params.seccion, 'seccion', getCatCached_(SHEETS.CAT_SECCIONES, SECCIONES));
  const dispositivos = optionalEnumList_(params.dispositivos, 'dispositivos', DISPOSITIVOS);
  // Informe de Gestion: info estructurada para publicar en el Portal eComm.
  const informeVersion = optionalString_(params.informe_version, 'informe_version', 60);
  const informeFechaImpl = optionalDate_(params.informe_fecha_implementacion, 'informe_fecha_implementacion');
  const informeDescGeneral = optionalString_(params.informe_descripcion_general, 'informe_descripcion_general', 4000);
  const informeDetallesTec = optionalString_(params.informe_detalles_tecnicos, 'informe_detalles_tecnicos', 4000);
  const informeResultado = optionalString_(params.informe_resultado, 'informe_resultado', 4000);
  // Requerimiento: brief para Jira (InfraCommerce) / GitLab (PIM).
  const requerimientoTexto = optionalString_(params.requerimiento_texto, 'requerimiento_texto', 4000);
  const requerimientoDetalles = optionalString_(params.requerimiento_detalles, 'requerimiento_detalles', 4000);
  const requerimientoObjetivo = optionalString_(params.requerimiento_objetivo, 'requerimiento_objetivo', 4000);

  const sheet = getSheet_(SHEETS.TAREAS);
  const id = getNextId_(sheet);
  const now = new Date();
  const email = (user && user.email) || '';

  sheet.appendRow([
    id, idProyecto, titulo, descripcion, tipo, estado, prioridad, responsable,
    fechaInicio, fechaLimite, avance, orden, now, now, email, email,
    area, tienda, urlJira, urlGitlab, urlFigmaP, urlFigmaE, idSprint, urlInforme,
    seccion, dispositivos, informeVersion, informeFechaImpl,
    informeDescGeneral, informeDetallesTec, informeResultado,
    requerimientoTexto, requerimientoDetalles, requerimientoObjetivo,
  ]);
  writeLog_('createTarea', 'TAREAS', id, 'OK', titulo, email);
  return { ok: true, data: { id: id } };
}

// ── ACTUALIZAR ────────────────────────────────────────────────
function updateTarea_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.TAREAS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Tarea no encontrada', code: 404 };

  const actual = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], TAREAS_COLS);
  const email = (user && user.email) || '';
  const updates = {};

  if (params.id_proyecto !== undefined) {
    updates.id_proyecto = validateId_(params.id_proyecto, 'id_proyecto');
    if (!findRowNumber_(getSheet_(SHEETS.PROYECTOS), updates.id_proyecto)) {
      return { ok: false, error: 'El proyecto asociado no existe', code: 404 };
    }
  }
  if (params.titulo !== undefined)      updates.titulo = validateString_(params.titulo, 'titulo', 200);
  if (params.descripcion !== undefined) updates.descripcion = optionalString_(params.descripcion, 'descripcion', 4000);
  if (params.tipo !== undefined)        updates.tipo = validateEnum_(params.tipo, 'tipo', getCatCached_(SHEETS.CAT_TIPOS_TAREA, TIPOS_TAREA));
  if (params.estado !== undefined)      updates.estado = validateEnum_(params.estado, 'estado', getCatCached_(SHEETS.CAT_ESTADOS_TAREA, ESTADOS_TAREA));
  if (params.prioridad !== undefined)   updates.prioridad = validateEnum_(params.prioridad, 'prioridad', getCatCached_(SHEETS.CAT_PRIORIDADES, PRIORIDADES));
  if (params.responsable !== undefined) updates.responsable = optionalString_(params.responsable, 'responsable', 120);
  if (params.fecha_inicio !== undefined) updates.fecha_inicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  if (params.fecha_limite !== undefined) updates.fecha_limite = optionalDate_(params.fecha_limite, 'fecha_limite');
  if (params.avance_pct !== undefined)  updates.avance_pct = _clampPct_(params.avance_pct);
  if (params.orden !== undefined)       updates.orden = parseInt(params.orden, 10) || 0;
  // S6: dimensiones y enlaces externos.
  if (params.area !== undefined)        updates.area = params.area ? validateEnum_(params.area, 'area', getCatCached_(SHEETS.CAT_AREAS, AREAS)) : '';
  if (params.tienda !== undefined)      updates.tienda = params.tienda ? validateEnum_(params.tienda, 'tienda', TIENDAS) : '';
  if (params.url_jira !== undefined)            updates.url_jira = optionalUrl_(params.url_jira, 'url_jira');
  if (params.url_gitlab !== undefined)          updates.url_gitlab = optionalUrl_(params.url_gitlab, 'url_gitlab');
  if (params.url_figma_prototipo !== undefined) updates.url_figma_prototipo = optionalUrl_(params.url_figma_prototipo, 'url_figma_prototipo');
  if (params.url_figma_editable !== undefined)  updates.url_figma_editable = optionalUrl_(params.url_figma_editable, 'url_figma_editable');
  if (params.url_informe_gestion !== undefined) updates.url_informe_gestion = optionalUrl_(params.url_informe_gestion, 'url_informe_gestion');
  // Dimensiones reutilizables (Informe de Gestion / Requerimiento).
  if (params.seccion !== undefined) updates.seccion = optionalEnumList_(params.seccion, 'seccion', getCatCached_(SHEETS.CAT_SECCIONES, SECCIONES));
  if (params.dispositivos !== undefined) updates.dispositivos = optionalEnumList_(params.dispositivos, 'dispositivos', DISPOSITIVOS);
  // Informe de Gestion: info estructurada para publicar en el Portal eComm.
  if (params.informe_version !== undefined) updates.informe_version = optionalString_(params.informe_version, 'informe_version', 60);
  if (params.informe_fecha_implementacion !== undefined) updates.informe_fecha_implementacion = optionalDate_(params.informe_fecha_implementacion, 'informe_fecha_implementacion');
  if (params.informe_descripcion_general !== undefined) updates.informe_descripcion_general = optionalString_(params.informe_descripcion_general, 'informe_descripcion_general', 4000);
  if (params.informe_detalles_tecnicos !== undefined) updates.informe_detalles_tecnicos = optionalString_(params.informe_detalles_tecnicos, 'informe_detalles_tecnicos', 4000);
  if (params.informe_resultado !== undefined) updates.informe_resultado = optionalString_(params.informe_resultado, 'informe_resultado', 4000);
  // Requerimiento: brief para Jira (InfraCommerce) / GitLab (PIM).
  if (params.requerimiento_texto !== undefined) updates.requerimiento_texto = optionalString_(params.requerimiento_texto, 'requerimiento_texto', 4000);
  if (params.requerimiento_detalles !== undefined) updates.requerimiento_detalles = optionalString_(params.requerimiento_detalles, 'requerimiento_detalles', 4000);
  if (params.requerimiento_objetivo !== undefined) updates.requerimiento_objetivo = optionalString_(params.requerimiento_objetivo, 'requerimiento_objetivo', 4000);
  if (params.id_sprint !== undefined) {
    updates.id_sprint = params.id_sprint ? validateId_(params.id_sprint, 'id_sprint') : '';
    if (updates.id_sprint && !findRowNumber_(getSheet_(SHEETS.SPRINTS), updates.id_sprint)) {
      return { ok: false, error: 'Sprint no encontrado', code: 404 };
    }
  }

  if (actual.estado === 'Documentaci\u00f3n' && updates.estado === ESTADO_TAREA_COMPLETADA) {
    return { ok: false, error: 'No se puede pasar de Documentaci\u00f3n a Finalizada. Primero debe ir a Revisi\u00f3n.', code: 409 };
  }

  if (updates.estado === 'Revisi\u00f3n' && _tareaPasoPorDocumentacion_(id, actual)) {
    const informe = updates.url_informe_gestion !== undefined ? updates.url_informe_gestion : actual.url_informe_gestion;
    if (!informe) {
      return { ok: false, error: 'Para pasar a Revisi\u00f3n una tarea documentada, carga la URL del informe de gestion del portal ecommerce.', code: 409 };
    }
  }

  if (updates.estado === ESTADO_TAREA_COMPLETADA) {
    const pendientes = getAllRows_(SHEETS.CHECKLIST, CHECKLIST_COLS)
      .filter(function(c) { return c.entidad === 'TAREA' && Number(c.id_entidad) === id && String(c.hecho) !== 'SI'; })
      .length;
    if (pendientes > 0) {
      return { ok: false, error: 'No se puede finalizar: hay ' + pendientes + ' ítem(s) del checklist sin completar', code: 409 };
    }
  }

  Object.keys(updates).forEach(function(campo) {
    const anterior = actual[campo];
    const nuevo = updates[campo] instanceof Date ? updates[campo].toISOString() : updates[campo];
    if (String(anterior === null ? '' : anterior) !== String(nuevo === null ? '' : nuevo)) {
      writeHistorial_('TAREA', id, campo, anterior, nuevo, email);
    }
  });

  updateFields_(SHEETS.TAREAS, rowNum, TAREAS_COLS, updates, email);
  writeLog_('updateTarea', 'TAREAS', id, 'OK', '', email);
  return { ok: true, data: { id: id } };
}

// ── ELIMINAR (soft delete → estado Cancelada) ─────────────────
function deleteTarea_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.TAREAS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Tarea no encontrada', code: 404 };
  const email = (user && user.email) || '';
  const estadoAnterior = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], TAREAS_COLS).estado;
  updateFields_(SHEETS.TAREAS, rowNum, TAREAS_COLS, { estado: 'Cancelada' }, email);
  writeHistorial_('TAREA', id, 'estado', estadoAnterior, 'Cancelada', email);
  writeLog_('deleteTarea', 'TAREAS', id, 'OK', 'soft delete', email);
  return { ok: true, data: { id: id } };
}

function _clampPct_(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function _tareaPasoPorDocumentacion_(id, actual) {
  if (actual && actual.estado === 'Documentaci\u00f3n') return true;
  return getAllRows_(SHEETS.HISTORIAL, HISTORIAL_COLS).some(function(h) {
    return h.entidad === 'TAREA'
      && Number(h.id_entidad) === Number(id)
      && h.campo === 'estado'
      && (h.valor_anterior === 'Documentaci\u00f3n' || h.valor_nuevo === 'Documentaci\u00f3n');
  });
}
