// ============================================================
// PROJECT CONTROL CENTER — Sprints.gs
// CRUD de la hoja SPRINTS. Sprints globales (multi-proyecto):
// agrupan TAREAS vía TAREAS.id_sprint. Soft delete → estado Cancelado.
// ============================================================

// ── LISTAR ────────────────────────────────────────────────────
function getSprints_(params) {
  params = params || {};
  let rows = getAllRows_(SHEETS.SPRINTS, SPRINTS_COLS);

  if (params.estado) rows = rows.filter(function(r) { return r.estado === params.estado; });
  if (params.incluir_cancelados !== true) rows = rows.filter(function(r) { return r.estado !== 'Cancelado'; });

  // Orden por fecha de inicio (los sin fecha al final).
  rows.sort(function(a, b) {
    const fa = a.fecha_inicio ? String(a.fecha_inicio) : '9999';
    const fb = b.fecha_inicio ? String(b.fecha_inicio) : '9999';
    return fa < fb ? -1 : (fa > fb ? 1 : 0);
  });

  return { ok: true, data: rows };
}

function getSprintById_(params) {
  const id = validateId_(params.id, 'id');
  const rows = getAllRows_(SHEETS.SPRINTS, SPRINTS_COLS);
  const s = rows.filter(function(r) { return Number(r.id) === id; })[0];
  if (!s) return { ok: false, error: 'Sprint no encontrado', code: 404 };
  return { ok: true, data: s };
}

// ── CREAR ─────────────────────────────────────────────────────
function createSprint_(params, user) {
  const nombre      = validateString_(params.nombre, 'nombre', 200);
  const objetivo    = optionalString_(params.objetivo, 'objetivo', 500);
  const estado      = optionalEnum_(params.estado, 'estado', ESTADOS_SPRINT, 'Planificado');
  const fechaInicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  const fechaFin    = optionalDate_(params.fecha_fin, 'fecha_fin');

  const sheet = getSheet_(SHEETS.SPRINTS);
  const id = getNextId_(sheet);
  const now = new Date();
  const email = (user && user.email) || '';

  sheet.appendRow([
    id, nombre, objetivo, estado, fechaInicio, fechaFin,
    now, now, email, email,
  ]);
  writeLog_('createSprint', 'SPRINTS', id, 'OK', nombre, email);
  return { ok: true, data: { id: id } };
}

// ── ACTUALIZAR ────────────────────────────────────────────────
function updateSprint_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.SPRINTS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Sprint no encontrado', code: 404 };

  const actual = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], SPRINTS_COLS);
  const email = (user && user.email) || '';
  const updates = {};

  if (params.nombre !== undefined)       updates.nombre = validateString_(params.nombre, 'nombre', 200);
  if (params.objetivo !== undefined)     updates.objetivo = optionalString_(params.objetivo, 'objetivo', 500);
  if (params.estado !== undefined)       updates.estado = validateEnum_(params.estado, 'estado', ESTADOS_SPRINT);
  if (params.fecha_inicio !== undefined) updates.fecha_inicio = optionalDate_(params.fecha_inicio, 'fecha_inicio');
  if (params.fecha_fin !== undefined)    updates.fecha_fin = optionalDate_(params.fecha_fin, 'fecha_fin');

  // Historial campo a campo (solo cambios reales).
  Object.keys(updates).forEach(function(campo) {
    const anterior = actual[campo];
    const nuevo = updates[campo] instanceof Date ? updates[campo].toISOString() : updates[campo];
    if (String(anterior === null ? '' : anterior) !== String(nuevo === null ? '' : nuevo)) {
      writeHistorial_('SPRINT', id, campo, anterior, nuevo, email);
    }
  });

  updateFields_(SHEETS.SPRINTS, rowNum, SPRINTS_COLS, updates, email);
  writeLog_('updateSprint', 'SPRINTS', id, 'OK', '', email);
  return { ok: true, data: { id: id } };
}

// ── ELIMINAR (soft delete → estado Cancelado) ─────────────────
function deleteSprint_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.SPRINTS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Sprint no encontrado', code: 404 };
  const email = (user && user.email) || '';
  updateFields_(SHEETS.SPRINTS, rowNum, SPRINTS_COLS, { estado: 'Cancelado' }, email);
  writeHistorial_('SPRINT', id, 'estado', '', 'Cancelado', email);
  writeLog_('deleteSprint', 'SPRINTS', id, 'OK', 'soft delete', email);
  return { ok: true, data: { id: id } };
}
