// ============================================================
// PROJECT CONTROL CENTER — Historial.gs
// Lectura del HISTORIAL (AUDIT_LOG). La escritura la hacen
// Proyectos.gs / Tareas.gs vía writeHistorial_ (Logger.gs).
// ============================================================

function getHistorial_(params) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');

  const rows = getAllRows_(SHEETS.HISTORIAL, HISTORIAL_COLS)
    .filter(function (h) { return h.entidad === entidad && Number(h.id_entidad) === idEntidad; });

  rows.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
  return { ok: true, data: rows };
}
