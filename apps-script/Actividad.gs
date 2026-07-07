// ============================================================
// PROJECT CONTROL CENTER - Actividad diaria
// Minuta rapida de comentarios nuevos y cambios registrados.
// ============================================================

function getActividadDiaria_(params) {
  const fecha = _actividadFechaParam_(params && params.fecha);
  const proyectos = getAllRows_(SHEETS.PROYECTOS, PROYECTOS_COLS);
  const tareas = getAllRows_(SHEETS.TAREAS, TAREAS_COLS);
  const sprints = getAllRows_(SHEETS.SPRINTS, SPRINTS_COLS);
  const proyectoById = _actividadMapById_(proyectos);
  const tareaById = _actividadMapById_(tareas);
  const sprintById = _actividadMapById_(sprints);

  const comentarios = getAllRows_(SHEETS.COMENTARIOS, COMENTARIOS_COLS)
    .filter(function(c) { return _actividadDateKey_(c.fecha_creacion) === fecha; })
    .map(function(c) {
      const ref = _actividadRef_(c.entidad, c.id_entidad, proyectoById, tareaById, sprintById);
      return {
        tipo: 'comentario',
        fecha: c.fecha_creacion,
        entidad: c.entidad,
        id_entidad: c.id_entidad,
        titulo: ref.titulo,
        proyecto: ref.proyecto,
        usuario: c.usuario,
        texto: c.texto,
      };
    });

  const cambios = getAllRows_(SHEETS.HISTORIAL, HISTORIAL_COLS)
    .filter(function(h) { return _actividadDateKey_(h.timestamp) === fecha; })
    .map(function(h) {
      const ref = _actividadRef_(h.entidad, h.id_entidad, proyectoById, tareaById, sprintById);
      return {
        tipo: 'cambio',
        fecha: h.timestamp,
        entidad: h.entidad,
        id_entidad: h.id_entidad,
        titulo: ref.titulo,
        proyecto: ref.proyecto,
        usuario: h.usuario,
        campo: h.campo,
        valor_anterior: h.valor_anterior,
        valor_nuevo: h.valor_nuevo,
      };
    });

  const items = comentarios.concat(cambios).sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });

  return {
    ok: true,
    data: {
      fecha: fecha,
      comentarios: comentarios,
      cambios: cambios,
      items: items,
      resumen: _actividadResumen_(items),
    },
  };
}

function _actividadFechaParam_(fecha) {
  const raw = String(fecha || '').trim();
  if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw _vErr_('Fecha invalida. Usar YYYY-MM-DD');
  return raw || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _actividadDateKey_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _actividadMapById_(rows) {
  const out = {};
  rows.forEach(function(row) { out[Number(row.id)] = row; });
  return out;
}

function _actividadRef_(entidad, idEntidad, proyectoById, tareaById, sprintById) {
  const id = Number(idEntidad);
  if (entidad === 'PROYECTO') {
    const p = proyectoById[id];
    return { titulo: p ? p.nombre : 'Proyecto #' + id, proyecto: p ? p.nombre : '' };
  }
  if (entidad === 'TAREA') {
    const t = tareaById[id];
    const p = t ? proyectoById[Number(t.id_proyecto)] : null;
    return { titulo: t ? t.titulo : 'Tarea #' + id, proyecto: p ? p.nombre : '' };
  }
  if (entidad === 'SPRINT') {
    const s = sprintById[id];
    return { titulo: s ? s.nombre : 'Sprint #' + id, proyecto: '' };
  }
  return { titulo: entidad + ' #' + id, proyecto: '' };
}

function _actividadResumen_(items) {
  const usuarios = {};
  const proyectos = {};
  const tareas = {};
  items.forEach(function(item) {
    if (item.usuario) usuarios[item.usuario] = true;
    if (item.proyecto) proyectos[item.proyecto] = true;
    if (item.entidad === 'TAREA') tareas[item.id_entidad] = true;
  });
  return {
    total: items.length,
    comentarios: items.filter(function(i) { return i.tipo === 'comentario'; }).length,
    cambios: items.filter(function(i) { return i.tipo === 'cambio'; }).length,
    usuarios: Object.keys(usuarios).length,
    proyectos: Object.keys(proyectos).length,
    tareas: Object.keys(tareas).length,
  };
}
