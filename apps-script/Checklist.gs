// ============================================================
// PROJECT CONTROL CENTER — Checklist.gs
// Checklist de proyectos y tareas (reemplaza subtareas).
// Relación polimórfica: (entidad, id_entidad).
// Leer: cualquier usuario autenticado. Escribir: solo Admin (router).
// ============================================================

// ── LISTAR ────────────────────────────────────────────────────
function getChecklist_(params) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');

  const rows = getAllRows_(SHEETS.CHECKLIST, CHECKLIST_COLS)
    .filter(function (c) { return c.entidad === entidad && Number(c.id_entidad) === idEntidad; });

  rows.sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
  return { ok: true, data: rows };
}

// ── CREAR ÍTEM ────────────────────────────────────────────────
function createChecklistItem_(params, user) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');
  const texto = validateString_(params.texto, 'texto', 500);

  // El registro referenciado debe existir.
  const sheetRef = getSheet_(entidad === 'PROYECTO' ? SHEETS.PROYECTOS : SHEETS.TAREAS);
  if (!findRowNumber_(sheetRef, idEntidad)) {
    return { ok: false, error: 'El ' + entidad.toLowerCase() + ' referenciado no existe', code: 404 };
  }

  const sheet = getSheet_(SHEETS.CHECKLIST);
  const id = getNextId_(sheet);
  const email = (user && user.email) || '';
  // orden = (máximo actual de la entidad) + 1.
  const existentes = getAllRows_(SHEETS.CHECKLIST, CHECKLIST_COLS)
    .filter(function (c) { return c.entidad === entidad && Number(c.id_entidad) === idEntidad; });
  const orden = existentes.reduce(function (m, c) { return Math.max(m, Number(c.orden) || 0); }, 0) + 1;

  sheet.appendRow([id, entidad, idEntidad, texto, 'NO', orden, new Date(), email]);
  writeLog_('createChecklistItem', entidad, idEntidad, 'OK', '', email);
  return { ok: true, data: { id: id } };
}

// ── MARCAR / DESMARCAR ────────────────────────────────────────
function toggleChecklistItem_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.CHECKLIST);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Ítem no encontrado', code: 404 };

  const hecho = params.hecho === true || params.hecho === 'SI' ? 'SI' : 'NO';
  sheet.getRange(rowNum, CHECKLIST_COLS.hecho).setValue(hecho);
  writeLog_('toggleChecklistItem', 'CHECKLIST', id, 'OK', hecho, (user && user.email) || '');
  return { ok: true, data: { id: id, hecho: hecho } };
}

// ── BORRAR ÍTEM (borrado físico — son efímeros, no auditados) ─
function deleteChecklistItem_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.CHECKLIST);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Ítem no encontrado', code: 404 };
  sheet.deleteRow(rowNum);
  writeLog_('deleteChecklistItem', 'CHECKLIST', id, 'OK', '', (user && user.email) || '');
  return { ok: true, data: { id: id } };
}
