// ============================================================
// PROJECT CONTROL CENTER — Comentarios.gs
// Comentarios de proyectos y tareas. Append-only (historial completo).
// Relación polimórfica: (entidad, id_entidad).
// Cualquier usuario autenticado puede comentar.
// ============================================================

// ── LISTAR ────────────────────────────────────────────────────
function getComentarios_(params) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');

  const rows = getAllRows_(SHEETS.COMENTARIOS, COMENTARIOS_COLS)
    .filter(function (c) { return c.entidad === entidad && Number(c.id_entidad) === idEntidad; });

  // Más recientes primero.
  rows.sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
  return { ok: true, data: rows };
}

// ── CREAR ─────────────────────────────────────────────────────
function createComentario_(params, user) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');
  const texto = validateString_(params.texto, 'texto', 2000);

  // El registro referenciado debe existir.
  const sheetRef = getSheet_(entidad === 'PROYECTO' ? SHEETS.PROYECTOS : SHEETS.TAREAS);
  if (!findRowNumber_(sheetRef, idEntidad)) {
    return { ok: false, error: 'El ' + entidad.toLowerCase() + ' referenciado no existe', code: 404 };
  }

  const sheet = getSheet_(SHEETS.COMENTARIOS);
  const id = getNextId_(sheet);
  const email = (user && user.email) || '';
  sheet.appendRow([id, entidad, idEntidad, texto, email, new Date()]);

  writeLog_('createComentario', entidad, idEntidad, 'OK', '', email);
  return { ok: true, data: { id: id } };
}
