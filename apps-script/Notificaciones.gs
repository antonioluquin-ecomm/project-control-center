// ============================================================
// PROJECT CONTROL CENTER — Notificaciones.gs
// Notificaciones por usuario (campana del top header).
// El destinatario se guarda por NOMBRE: el campo `responsable` de las tareas
// es texto libre (no FK a USUARIOS), y las menciones referencian nombres.
// La emisión es interna (la disparan Tareas.gs / Comentarios.gs); no es una
// action del router. Solo lectura y marcado se exponen como actions.
// ============================================================

// ── EMITIR (interno) ──────────────────────────────────────────
// Append de una notificación. No emite si el destinatario está vacío o si es
// el mismo que la origina (no auto-notificarse). Nunca rompe la operación
// principal: envuelto en try/catch silencioso (como writeHistorial_).
function emitNotificacion_(destinatarioNombre, tipo, entidad, idEntidad, mensaje, origenNombre) {
  try {
    const dest = String(destinatarioNombre || '').trim();
    if (!dest) return;
    if (dest === String(origenNombre || '').trim()) return; // no auto-notificar

    const sheet = getSheet_(SHEETS.NOTIFICACIONES);
    const id = getNextId_(sheet);
    sheet.appendRow([
      id, new Date(), dest, tipo, entidad, idEntidad,
      String(mensaje || ''), String(origenNombre || ''), 'NO',
    ]);
  } catch (err) {
    // Registrar sin interrumpir el flujo del que la disparó.
    try { writeError_('emitNotificacion', err.message, err.stack, ''); } catch (e) {}
  }
}

// ── LISTAR (para el usuario logueado) ─────────────────────────
// Devuelve las últimas ~30 notificaciones del usuario + conteo de no leídas.
function getNotificaciones_(params, user) {
  // Defensivo: si la hoja aún no fue creada (migración sin correr), no romper
  // la carga de la página — devolver vacío. El polling cada 60s lo reintenta.
  if (!getSpreadsheet_().getSheetByName(SHEETS.NOTIFICACIONES)) {
    return { ok: true, data: { items: [], no_leidas: 0 } };
  }
  const nombre = getNombreByEmail_(user && user.email);
  if (!nombre) return { ok: true, data: { items: [], no_leidas: 0 } };

  const rows = getAllRows_(SHEETS.NOTIFICACIONES, NOTIFICACIONES_COLS)
    .filter(function(n) { return String(n.destinatario) === nombre; });

  rows.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

  const noLeidas = rows.filter(function(n) { return String(n.leida) !== 'SI'; }).length;
  const items = rows.slice(0, 30);
  return { ok: true, data: { items: items, no_leidas: noLeidas } };
}

// ── MARCAR UNA COMO LEÍDA ─────────────────────────────────────
function markNotificacionLeida_(params, user) {
  const id = validateId_(params.id, 'id');
  const nombre = getNombreByEmail_(user && user.email);
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.NOTIFICACIONES);
  if (!sheet) return { ok: false, error: 'Notificación no encontrada', code: 404 };
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Notificación no encontrada', code: 404 };

  const dest = sheet.getRange(rowNum, NOTIFICACIONES_COLS.destinatario).getValue();
  if (String(dest) !== nombre) {
    return { ok: false, error: 'No podés marcar notificaciones de otro usuario', code: 403 };
  }
  sheet.getRange(rowNum, NOTIFICACIONES_COLS.leida).setValue('SI');
  return { ok: true, data: { id: id } };
}

// ── MARCAR TODAS COMO LEÍDAS ──────────────────────────────────
function markAllNotificacionesLeidas_(params, user) {
  const nombre = getNombreByEmail_(user && user.email);
  if (!nombre) return { ok: true, data: { count: 0 } };

  const sheet = getSpreadsheet_().getSheetByName(SHEETS.NOTIFICACIONES);
  if (!sheet) return { ok: true, data: { count: 0 } };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, data: { count: 0 } };

  const numRows = lastRow - 1;
  const dests  = sheet.getRange(2, NOTIFICACIONES_COLS.destinatario, numRows, 1).getValues();
  const leidas = sheet.getRange(2, NOTIFICACIONES_COLS.leida, numRows, 1).getValues();

  let count = 0;
  for (let i = 0; i < numRows; i++) {
    if (String(dests[i][0]) === nombre && String(leidas[i][0]) !== 'SI') {
      leidas[i][0] = 'SI';
      count++;
    }
  }
  if (count > 0) sheet.getRange(2, NOTIFICACIONES_COLS.leida, numRows, 1).setValues(leidas);
  return { ok: true, data: { count: count } };
}

// ── HELPER: email → nombre (cacheado por request) ─────────────
const _nombreByEmailCache_ = {};
function getNombreByEmail_(email) {
  const key = String(email || '').toLowerCase().trim();
  if (!key) return '';
  if (_nombreByEmailCache_[key] !== undefined) return _nombreByEmailCache_[key];

  const nombre = getAllRows_(SHEETS.USUARIOS, USUARIOS_COLS)
    .filter(function(u) { return String(u.email).toLowerCase() === key; })
    .map(function(u) { return u.nombre; })[0] || '';

  _nombreByEmailCache_[key] = nombre;
  return nombre;
}
