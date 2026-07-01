// ============================================================
// PROJECT CONTROL CENTER — Proyectos.gs
// CRUD de la hoja PROYECTOS. avance_pct se calcula al servir.
// ============================================================

// ── LISTAR ────────────────────────────────────────────────────
function getProyectos_(params) {
  params = params || {};
  let rows = getAllRows_(SHEETS.PROYECTOS, PROYECTOS_COLS);

  // avance calculado desde TAREAS (una sola lectura).
  const avancePorProyecto = _avancePorProyecto_();
  const today = _todayStr_();
  rows.forEach(function(p) {
    p.avance_pct = avancePorProyecto[p.id] !== undefined ? avancePorProyecto[p.id] : 0;
    p.vencido = (ESTADOS_PROYECTO_CERRADOS.indexOf(p.estado) === -1)
      && p.fecha_fin_estimada && String(p.fecha_fin_estimada).slice(0, 10) < today;
  });

  if (params.estado)      rows = rows.filter(function(r) { return r.estado === params.estado; });
  if (params.responsable) rows = rows.filter(function(r) { return r.responsable === params.responsable; });
  if (params.sitio)       rows = rows.filter(function(r) { return r.sitio === params.sitio; });
  if (params.incluir_cancelados !== true) rows = rows.filter(function(r) { return r.estado !== 'Cancelado'; });

  return { ok: true, data: rows };
}

function getProyectoById_(params) {
  const id = validateId_(params.id, 'id');
  const rows = getAllRows_(SHEETS.PROYECTOS, PROYECTOS_COLS);
  const p = rows.filter(function(r) { return Number(r.id) === id; })[0];
  if (!p) return { ok: false, error: 'Proyecto no encontrado', code: 404 };
  const avance = _avancePorProyecto_();
  p.avance_pct = avance[p.id] !== undefined ? avance[p.id] : 0;
  return { ok: true, data: p };
}

// ── CREAR ─────────────────────────────────────────────────────
function createProyecto_(params, user) {
  const nombre      = validateString_(params.nombre, 'nombre', 200);
  const estado      = optionalEnum_(params.estado, 'estado', getCatCached_(SHEETS.CAT_ESTADOS_PROYECTO, ESTADOS_PROYECTO), 'Por Hacer');
  const prioridad   = optionalEnum_(params.prioridad, 'prioridad', getCatCached_(SHEETS.CAT_PRIORIDADES, PRIORIDADES), 'Medium');
  const sitio       = params.sitio ? validateEnum_(params.sitio, 'sitio', getCatCached_(SHEETS.CAT_SITIOS, SITIOS)) : '';
  const descripcion = optionalString_(params.descripcion, 'descripcion', 4000);
  const responsable = optionalString_(params.responsable, 'responsable', 120);
  const observaciones = optionalString_(params.observaciones, 'observaciones', 4000);
  const fechaInicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  const fechaFin    = optionalDate_(params.fecha_fin_estimada, 'fecha_fin_estimada');

  const sheet = getSheet_(SHEETS.PROYECTOS);
  const id = getNextId_(sheet);
  const now = new Date();
  const email = (user && user.email) || '';

  sheet.appendRow([
    id, nombre, descripcion, estado, prioridad, responsable, sitio,
    fechaInicio, fechaFin, observaciones, now, now, email, email,
  ]);
  writeLog_('createProyecto', 'PROYECTOS', id, 'OK', nombre, email);
  return { ok: true, data: { id: id } };
}

// ── ACTUALIZAR ────────────────────────────────────────────────
function updateProyecto_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.PROYECTOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Proyecto no encontrado', code: 404 };

  const actual = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], PROYECTOS_COLS);
  const email = (user && user.email) || '';
  const updates = {};

  if (params.nombre !== undefined)        updates.nombre = validateString_(params.nombre, 'nombre', 200);
  if (params.descripcion !== undefined)   updates.descripcion = optionalString_(params.descripcion, 'descripcion', 4000);
  if (params.estado !== undefined)        updates.estado = validateEnum_(params.estado, 'estado', getCatCached_(SHEETS.CAT_ESTADOS_PROYECTO, ESTADOS_PROYECTO));
  if (params.prioridad !== undefined)     updates.prioridad = validateEnum_(params.prioridad, 'prioridad', getCatCached_(SHEETS.CAT_PRIORIDADES, PRIORIDADES));
  if (params.responsable !== undefined)   updates.responsable = optionalString_(params.responsable, 'responsable', 120);
  if (params.sitio !== undefined)         updates.sitio = params.sitio ? validateEnum_(params.sitio, 'sitio', getCatCached_(SHEETS.CAT_SITIOS, SITIOS)) : '';
  if (params.observaciones !== undefined) updates.observaciones = optionalString_(params.observaciones, 'observaciones', 4000);
  if (params.fecha_inicio !== undefined)        updates.fecha_inicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  if (params.fecha_fin_estimada !== undefined)  updates.fecha_fin_estimada = optionalDate_(params.fecha_fin_estimada, 'fecha_fin_estimada');

  // Historial campo a campo (solo cambios reales).
  Object.keys(updates).forEach(function(campo) {
    const anterior = actual[campo];
    const nuevo = updates[campo] instanceof Date ? updates[campo].toISOString() : updates[campo];
    if (String(anterior === null ? '' : anterior) !== String(nuevo === null ? '' : nuevo)) {
      writeHistorial_('PROYECTO', id, campo, anterior, nuevo, email);
    }
  });

  updateFields_(SHEETS.PROYECTOS, rowNum, PROYECTOS_COLS, updates, email);
  writeLog_('updateProyecto', 'PROYECTOS', id, 'OK', '', email);
  return { ok: true, data: { id: id } };
}

// ── ELIMINAR (soft delete → estado Cancelado) ─────────────────
function deleteProyecto_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.PROYECTOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Proyecto no encontrado', code: 404 };
  const email = (user && user.email) || '';
  const estadoAnterior = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], PROYECTOS_COLS).estado;
  updateFields_(SHEETS.PROYECTOS, rowNum, PROYECTOS_COLS, { estado: 'Cancelado' }, email);
  writeHistorial_('PROYECTO', id, 'estado', estadoAnterior, 'Cancelado', email);
  writeLog_('deleteProyecto', 'PROYECTOS', id, 'OK', 'soft delete', email);
  return { ok: true, data: { id: id } };
}

// ── HELPERS internos ──────────────────────────────────────────
// % completado por proyecto = tareas Finalizadas / tareas no canceladas.
function _avancePorProyecto_() {
  const tareas = getAllRows_(SHEETS.TAREAS, TAREAS_COLS);
  const total = {}, hechas = {};
  tareas.forEach(function(t) {
    if (t.estado === 'Cancelada') return;
    const pid = t.id_proyecto;
    total[pid] = (total[pid] || 0) + 1;
    if (t.estado === ESTADO_TAREA_COMPLETADA) hechas[pid] = (hechas[pid] || 0) + 1;
  });
  const out = {};
  Object.keys(total).forEach(function(pid) {
    out[pid] = total[pid] ? Math.round((hechas[pid] || 0) / total[pid] * 100) : 0;
  });
  return out;
}

function _todayStr_() {
  return new Date().toISOString().slice(0, 10);
}
