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
      estados_proyecto: getCatValues_(CATALOGOS.CAT_ESTADOS_PROYECTO).length ? getCatValues_(CATALOGOS.CAT_ESTADOS_PROYECTO) : ESTADOS_PROYECTO,
      estados_tarea:    getCatValues_(CATALOGOS.CAT_ESTADOS_TAREA).length    ? getCatValues_(CATALOGOS.CAT_ESTADOS_TAREA)    : ESTADOS_TAREA,
      tipos_tarea:      getCatValues_(CATALOGOS.CAT_TIPOS_TAREA).length      ? getCatValues_(CATALOGOS.CAT_TIPOS_TAREA)      : TIPOS_TAREA,
      prioridades:      getCatValues_(CATALOGOS.CAT_PRIORIDADES).length      ? getCatValues_(CATALOGOS.CAT_PRIORIDADES)      : PRIORIDADES,
      responsables:     getCatValues_(CATALOGOS.CAT_RESPONSABLES),
      sitios:           getCatValues_(CATALOGOS.CAT_SITIOS).length           ? getCatValues_(CATALOGOS.CAT_SITIOS)           : SITIOS,
      areas:            getCatValues_(CATALOGOS.CAT_AREAS).length            ? getCatValues_(CATALOGOS.CAT_AREAS)            : AREAS,
      tiendas:          getCatValues_(CATALOGOS.CAT_TIENDAS).length          ? getCatValues_(CATALOGOS.CAT_TIENDAS)          : TIENDAS,
      secciones:        getCatValues_(CATALOGOS.CAT_SECCIONES).length        ? getCatValues_(CATALOGOS.CAT_SECCIONES)        : SECCIONES,
      estados_sprint:   getCatValues_(CATALOGOS.CAT_ESTADOS_SPRINT).length    ? getCatValues_(CATALOGOS.CAT_ESTADOS_SPRINT)   : ESTADOS_SPRINT,
    },
  };
}

// Catálogos que el admin puede editar desde la UI (lista blanca).
const _CATALOGOS_EDITABLES_ = [
  CATALOGOS.CAT_ESTADOS_PROYECTO, CATALOGOS.CAT_ESTADOS_TAREA, CATALOGOS.CAT_TIPOS_TAREA,
  CATALOGOS.CAT_PRIORIDADES, CATALOGOS.CAT_SITIOS, CATALOGOS.CAT_AREAS,
  CATALOGOS.CAT_TIENDAS, CATALOGOS.CAT_SECCIONES, CATALOGOS.CAT_ESTADOS_SPRINT, CATALOGOS.CAT_RESPONSABLES,
];

// Reemplaza los valores de una hoja CAT_ por el array recibido.
// Mantiene la fila 1 (header = nombre de la hoja). Borra filas 2..n y rescribe.
function updateCatalogo_(params, user) {
  if (_CATALOGOS_EDITABLES_.indexOf(params.catalogo) === -1)
    return { ok: false, error: 'Catálogo no editable: ' + params.catalogo, code: 400 };

  const valores = params.valores;
  if (!Array.isArray(valores) || valores.length === 0)
    return { ok: false, error: 'valores debe ser un array no vacío', code: 400 };

  const limpios = valores.map(function(v) { return String(v).trim(); }).filter(Boolean);
  if (!limpios.length) return { ok: false, error: 'Todos los valores estaban vacíos', code: 400 };

  setCatValues_(params.catalogo, limpios);

  // Invalida la caché del catálogo para este request (ya actualizado).
  delete _catCache_[params.catalogo];

  const email = (user && user.email) || '';
  writeLog_('updateCatalogo', params.catalogo, 0, 'OK', limpios.length + ' valores', email);
  return { ok: true, data: { catalogo: params.catalogo, count: limpios.length } };
}

function _contarPor_(rows, campo) {
  const out = {};
  rows.forEach(function(r) { const k = r[campo] || 'Sin estado'; out[k] = (out[k] || 0) + 1; });
  return out;
}
