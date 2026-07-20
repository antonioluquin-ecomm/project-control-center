// ============================================================
// PROJECT CONTROL CENTER — Comentarios.gs
// Comentarios de proyectos y tareas. El autor puede corregirlos durante 15 minutos.
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

// ── EDITAR ────────────────────────────────────────────────────
function updateComentario_(params, user) {
  const id     = validateId_(params.id, 'id');
  const texto  = validateString_(params.texto, 'texto', 2000);

  const sheet  = getSheet_(SHEETS.COMENTARIOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Comentario no encontrado', code: 404 };

  const autor = String(sheet.getRange(rowNum, COMENTARIOS_COLS.usuario).getValue() || '').trim().toLowerCase();
  const userEmail = String((user && user.email) || '').trim().toLowerCase();
  if (!userEmail || autor !== userEmail) {
    return { ok: false, error: 'Solo podés editar tus propios comentarios', code: 403 };
  }

  const fechaCreacion = sheet.getRange(rowNum, COMENTARIOS_COLS.fecha_creacion).getValue();
  const creadoEn = fechaCreacion instanceof Date ? fechaCreacion.getTime() : new Date(fechaCreacion).getTime();
  if (isNaN(creadoEn) || Date.now() - creadoEn > 15 * 60 * 1000) {
    return { ok: false, error: 'El plazo de 15 minutos para editar este comentario venció', code: 403 };
  }

  sheet.getRange(rowNum, COMENTARIOS_COLS.texto).setValue(texto);
  sheet.getRange(rowNum, COMENTARIOS_COLS.fecha_edicion).setValue(new Date());

  writeLog_('updateComentario', 'COMENTARIO', id, 'OK', '', user.email);
  return { ok: true, data: { id: id } };
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

  // Notificaciones: menciones (@nombre) y aviso al responsable de la entidad.
  _notificarComentario_(entidad, idEntidad, texto, email);
  return { ok: true, data: { id: id } };
}

// ── Notificaciones de un comentario nuevo ─────────────────────
// 1) Menciones: por cada usuario activo cuyo nombre aparezca como "@Nombre"
//    en el texto (comparar contra el nombre completo evita el problema de
//    nombres con espacios). 2) Aviso al responsable de la tarea/proyecto.
// Cada destinatario se notifica una sola vez (la mención tiene prioridad).
function _notificarComentario_(entidad, idEntidad, texto, email) {
  const origen = getNombreByEmail_(email);
  const notificados = {};

  // 1) Menciones.
  const usuarios = getAllRows_(SHEETS.USUARIOS, USUARIOS_COLS)
    .filter(function(u) { return String(u.activo) === 'SI' && u.nombre; });
  usuarios.forEach(function(u) {
    if (texto.indexOf('@' + u.nombre) !== -1 && !notificados[u.nombre]) {
      emitNotificacion_(u.nombre, 'MENCION', entidad, idEntidad,
        origen + ' te mencionó en un comentario', origen);
      notificados[u.nombre] = true;
    }
  });

  // 2) Aviso al responsable de la entidad (si no fue ya notificado por mención).
  const sheetRef = getSheet_(entidad === 'PROYECTO' ? SHEETS.PROYECTOS : SHEETS.TAREAS);
  const rowNum = findRowNumber_(sheetRef, idEntidad);
  if (!rowNum) return;
  const colMap = entidad === 'PROYECTO' ? PROYECTOS_COLS : TAREAS_COLS;
  const responsable = String(sheetRef.getRange(rowNum, colMap.responsable).getValue() || '').trim();
  if (responsable && !notificados[responsable]) {
    emitNotificacion_(responsable, 'COMENTARIO', entidad, idEntidad,
      origen + ' comentó en "' + _tituloEntidad_(sheetRef, rowNum, colMap) + '"', origen);
  }
}

// Título legible de la entidad para el texto de la notificación.
function _tituloEntidad_(sheet, rowNum, colMap) {
  const col = colMap.titulo || colMap.nombre;
  return String(sheet.getRange(rowNum, col).getValue() || '');
}
