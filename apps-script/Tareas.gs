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
  const descripcion = optionalString_(params.descripcion, 'descripcion', 2000);
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
  // Sprint (global, opcional). Verifica existencia para evitar FK rota.
  const idSprint = params.id_sprint ? validateId_(params.id_sprint, 'id_sprint') : '';
  if (idSprint && !findRowNumber_(getSheet_(SHEETS.SPRINTS), idSprint)) {
    return { ok: false, error: 'Sprint no encontrado', code: 404 };
  }

  const sheet = getSheet_(SHEETS.TAREAS);
  const id = getNextId_(sheet);
  const now = new Date();
  const email = (user && user.email) || '';

  sheet.appendRow([
    id, idProyecto, titulo, descripcion, tipo, estado, prioridad, responsable,
    fechaInicio, fechaLimite, avance, orden, now, now, email, email,
    area, tienda, urlJira, urlGitlab, urlFigmaP, urlFigmaE, idSprint,
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

  if (params.titulo !== undefined)      updates.titulo = validateString_(params.titulo, 'titulo', 200);
  if (params.descripcion !== undefined) updates.descripcion = optionalString_(params.descripcion, 'descripcion', 2000);
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
  if (params.id_sprint !== undefined)           updates.id_sprint = params.id_sprint ? validateId_(params.id_sprint, 'id_sprint') : '';

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
