// ============================================================
// PROJECT CONTROL CENTER - Actividad diaria
// Minuta rapida de altas, cambios y comentarios registrados.
// ============================================================

// accion (LOGS) -> entidad singular (igual que HISTORIAL/COMENTARIOS).
const ACTIVIDAD_ALTA_ENTIDAD_ = {
  createProyecto: 'PROYECTO',
  createTarea:    'TAREA',
  createSprint:   'SPRINT',
};

// Rango maximo de dias por consulta (validacion defensiva; ver getRowsInDateRange_
// en Helpers.gs para la lectura acotada de HISTORIAL/LOGS/COMENTARIOS).
const ACTIVIDAD_RANGO_MAX_DIAS_ = 31;

function getActividadDiaria_(params) {
  const fecha = _actividadFechaParam_(params && params.fecha);
  const fechaHasta = _actividadFechaHastaParam_(params && params.fecha_hasta, fecha);
  const proyectos = getAllRows_(SHEETS.PROYECTOS, PROYECTOS_COLS);
  const tareas = getAllRows_(SHEETS.TAREAS, TAREAS_COLS);
  const sprints = getAllRows_(SHEETS.SPRINTS, SPRINTS_COLS);
  const proyectoById = _actividadMapById_(proyectos);
  const tareaById = _actividadMapById_(tareas);
  const sprintById = _actividadMapById_(sprints);

  const altas = getRowsInDateRange_(SHEETS.LOGS, LOGS_COLS, 'timestamp', fecha, fechaHasta)
    .filter(function(l) { return ACTIVIDAD_ALTA_ENTIDAD_[l.accion]; })
    .map(function(l) {
      const entidad = ACTIVIDAD_ALTA_ENTIDAD_[l.accion];
      const ref = _actividadRef_(entidad, l.entidad_id, proyectoById, tareaById, sprintById);
      return _actividadItem_('alta', l.timestamp, entidad, l.entidad_id, ref, l.usuario);
    });

  const comentarios = getRowsInDateRange_(SHEETS.COMENTARIOS, COMENTARIOS_COLS, 'fecha_creacion', fecha, fechaHasta)
    .map(function(c) {
      const ref = _actividadRef_(c.entidad, c.id_entidad, proyectoById, tareaById, sprintById);
      const item = _actividadItem_('comentario', c.fecha_creacion, c.entidad, c.id_entidad, ref, c.usuario);
      item.texto = c.texto;
      return item;
    });

  const cambios = getRowsInDateRange_(SHEETS.HISTORIAL, HISTORIAL_COLS, 'timestamp', fecha, fechaHasta)
    .map(function(h) {
      const ref = _actividadRef_(h.entidad, h.id_entidad, proyectoById, tareaById, sprintById);
      const item = _actividadItem_(h.campo === 'estado' ? 'estado' : 'cambio', h.timestamp, h.entidad, h.id_entidad, ref, h.usuario);
      item.campo = h.campo;
      item.valor_anterior = h.valor_anterior;
      item.valor_nuevo = h.valor_nuevo;
      return item;
    });

  const items = altas.concat(comentarios, cambios).sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });

  return {
    ok: true,
    data: {
      fecha: fecha,
      fecha_hasta: fechaHasta,
      items: items,
    },
  };
}

function _actividadItem_(tipo, fecha, entidad, idEntidad, ref, usuario) {
  return {
    tipo: tipo,
    fecha: fecha,
    dia: _actividadDateKey_(fecha),
    hora: _actividadHora_(fecha),
    entidad: entidad,
    id_entidad: idEntidad,
    titulo: ref.titulo,
    proyecto: ref.proyecto,
    id_proyecto: ref.id_proyecto || null,
    usuario: usuario || '',
  };
}

function _actividadFechaParam_(fecha) {
  const raw = String(fecha || '').trim();
  if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw _vErr_('Fecha invalida. Usar YYYY-MM-DD');
  return raw || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _actividadFechaHastaParam_(fechaHasta, fechaDesde) {
  const raw = String(fechaHasta || '').trim();
  if (!raw) return fechaDesde;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw _vErr_('Fecha hasta invalida. Usar YYYY-MM-DD');
  if (raw < fechaDesde) throw _vErr_('La fecha hasta no puede ser anterior a la fecha desde');
  const dias = (new Date(raw) - new Date(fechaDesde)) / 86400000;
  if (dias > ACTIVIDAD_RANGO_MAX_DIAS_) throw _vErr_('El rango maximo es de ' + ACTIVIDAD_RANGO_MAX_DIAS_ + ' dias');
  return raw;
}

function _actividadDateKey_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _actividadHora_(value) {
  if (!value) return '--:--';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '--:--';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm');
}

function _actividadMapById_(rows) {
  const out = {};
  rows.forEach(function(row) { out[Number(row.id)] = row; });
  return out;
}

// proyecto/id_proyecto habilitan el deep-link "ver tareas del proyecto" en el front.
function _actividadRef_(entidad, idEntidad, proyectoById, tareaById, sprintById) {
  const id = Number(idEntidad);
  if (entidad === 'PROYECTO') {
    const p = proyectoById[id];
    return { titulo: p ? p.nombre : 'Proyecto #' + id, proyecto: p ? p.nombre : '', id_proyecto: p ? id : null };
  }
  if (entidad === 'TAREA') {
    const t = tareaById[id];
    const pid = t ? Number(t.id_proyecto) : null;
    const p = t ? proyectoById[pid] : null;
    return { titulo: t ? t.titulo : 'Tarea #' + id, proyecto: p ? p.nombre : '', id_proyecto: p ? pid : null };
  }
  if (entidad === 'SPRINT') {
    const s = sprintById[id];
    return { titulo: s ? s.nombre : 'Sprint #' + id, proyecto: '', id_proyecto: null };
  }
  return { titulo: entidad + ' #' + id, proyecto: '', id_proyecto: null };
}
