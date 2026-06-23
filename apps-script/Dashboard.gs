// ============================================================
// PROJECT CONTROL CENTER — Dashboard.gs
// Métricas agregadas (getResumen) y catálogos (getCatalogos).
// Campos calculados al servir, nunca almacenados. (sheets §10)
// ============================================================

function getResumen_() {
  const proyectos = getAllRows_(SHEETS.PROYECTOS, PROYECTOS_COLS)
    .filter(function(p) { return p.estado !== 'Cancelado'; });
  const tareas = getAllRows_(SHEETS.TAREAS, TAREAS_COLS)
    .filter(function(t) { return t.estado !== 'Cancelada'; });
  const today = _todayStr_();

  const proyPorEstado = _contarPor_(proyectos, 'estado');
  const tarPorEstado  = _contarPor_(tareas, 'estado');

  const proyVencidos = proyectos.filter(function(p) {
    return ESTADOS_PROYECTO_CERRADOS.indexOf(p.estado) === -1
      && p.fecha_fin_estimada && String(p.fecha_fin_estimada).slice(0, 10) < today;
  }).length;

  const tarVencidas = tareas.filter(function(t) {
    return ESTADOS_TAREA_CERRADOS.indexOf(t.estado) === -1
      && t.fecha_limite && String(t.fecha_limite).slice(0, 10) < today;
  }).length;

  return {
    ok: true,
    data: {
      proyectos: {
        total:        proyectos.length,
        activos:      proyectos.filter(function(p) { return ESTADOS_PROYECTO_CERRADOS.indexOf(p.estado) === -1; }).length,
        finalizados:  proyPorEstado['Finalizado'] || 0,
        vencidos:     proyVencidos,
        por_estado:   proyPorEstado,
      },
      tareas: {
        total:       tareas.length,
        vencidas:    tarVencidas,
        por_estado:  tarPorEstado,
      },
    },
  };
}

function getCatalogos_() {
  return {
    ok: true,
    data: {
      estados_proyecto: getCatValues_(SHEETS.CAT_ESTADOS_PROYECTO).length ? getCatValues_(SHEETS.CAT_ESTADOS_PROYECTO) : ESTADOS_PROYECTO,
      estados_tarea:    getCatValues_(SHEETS.CAT_ESTADOS_TAREA).length    ? getCatValues_(SHEETS.CAT_ESTADOS_TAREA)    : ESTADOS_TAREA,
      tipos_tarea:      getCatValues_(SHEETS.CAT_TIPOS_TAREA).length      ? getCatValues_(SHEETS.CAT_TIPOS_TAREA)      : TIPOS_TAREA,
      prioridades:      getCatValues_(SHEETS.CAT_PRIORIDADES).length      ? getCatValues_(SHEETS.CAT_PRIORIDADES)      : PRIORIDADES,
      responsables:     getCatValues_(SHEETS.CAT_RESPONSABLES),
      sitios:           getCatValues_(SHEETS.CAT_SITIOS).length           ? getCatValues_(SHEETS.CAT_SITIOS)           : SITIOS,
      areas:            getCatValues_(SHEETS.CAT_AREAS).length            ? getCatValues_(SHEETS.CAT_AREAS)            : AREAS,
      tiendas:          getCatValues_(SHEETS.CAT_TIENDAS).length          ? getCatValues_(SHEETS.CAT_TIENDAS)          : TIENDAS,
    },
  };
}

function _contarPor_(rows, campo) {
  const out = {};
  rows.forEach(function(r) { const k = r[campo] || 'Sin estado'; out[k] = (out[k] || 0) + 1; });
  return out;
}
