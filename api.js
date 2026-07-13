/* ============================================================
   PROJECT CONTROL CENTER — api.js
   Comunicación con Apps Script + modo demo local (mock).
   Nunca hacer fetch() directo en los módulos: usar estos helpers.
   ============================================================ */

/* ─── UTILIDADES UI ──────────────────────────────────────── */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Subset de markdown para descripciones/observaciones (# / ## títulos, - / * viñetas, **negrita**).
// Trabaja siempre sobre texto ya escapado con escapeHtml — nunca sobre el raw del usuario.
function renderRichInlineText(escapedLine) {
  return escapedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderRichText(value) {
  const lines = escapeHtml(value).split('\n');
  let html = '';
  let inList = false;
  const closeList = function () { if (inList) { html += '</ul>'; inList = false; } };
  lines.forEach(function (line) {
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    const li = line.match(/^[-*]\s+(.*)/);
    if (h2) { closeList(); html += '<h5 class="rt-h2">' + renderRichInlineText(h2[1]) + '</h5>'; }
    else if (h1) { closeList(); html += '<h4 class="rt-h1">' + renderRichInlineText(h1[1]) + '</h4>'; }
    else if (li) { if (!inList) { html += '<ul class="rt-list">'; inList = true; } html += '<li>' + renderRichInlineText(li[1]) + '</li>'; }
    else if (line.trim() === '') { closeList(); html += '<br>'; }
    else { closeList(); html += renderRichInlineText(line) + '<br>'; }
  });
  closeList();
  return html;
}

function setStatus(elId, msg, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.className = 'status-bar' + (type ? ' ' + type : '');
  el.textContent = msg;
}

function toast(icon, msg, type) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = '<span>' + escapeHtml(icon) + '</span><span>' + escapeHtml(msg) + '</span>';
  wrap.appendChild(t);
  setTimeout(function () { t.remove(); }, 3200);
}

function normalizeText(v) {
  return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR');
}

/* ─── CSV ────────────────────────────────────────────────── */

function csvEscape(value) {
  let str = String(value == null ? '' : value).replace(/"/g, '""');
  // Evita CSV/formula injection: Excel/Sheets ejecuta como formula si la celda arranca con = + - @.
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  return /[,;\n"]/.test(str) ? '"' + str + '"' : str;
}

function downloadCSV(filename, rows) {
  const content = rows.map(function (r) { return r.map(csvEscape).join(','); }).join('\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── LLAMADA AL BACKEND ─────────────────────────────────── */

// callApiRaw(action, params) → { ...data }  (lanza Error si !ok)
async function callApiRaw(action, params) {
  if (CFG.isMock()) return _mockCall(action, params || {});

  const sesToken = (typeof SESSION !== 'undefined') ? SESSION.token : '';
  const res = await fetch(CFG.apiUrl, {
    method: 'POST',
    body: JSON.stringify({ action: action, session_token: sesToken, params: params || {} }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (!json.ok) {
    if (json.code === 401 && typeof authLogout === 'function') { authLogout(); }
    throw new Error(json.error || 'Error desconocido');
  }
  return json.data !== undefined ? json.data : json;
}

/* ─── HELPERS DE DOMINIO ─────────────────────────────────── */

function apiGetResumen()        { return callApiRaw('getResumen'); }
function apiGetActividadDiaria(p) { return callApiRaw('getActividadDiaria', p); }
function apiGetCatalogos()      { return callApiRaw('getCatalogos'); }
function apiGetProyectos(p)     { return callApiRaw('getProyectos', p); }
function apiGetProyecto(id)     { return callApiRaw('getProyectoById', { id: id }); }
function apiCreateProyecto(d)   { return callApiRaw('createProyecto', d); }
function apiUpdateProyecto(d)   { return callApiRaw('updateProyecto', d); }
function apiDeleteProyecto(id)  { return callApiRaw('deleteProyecto', { id: id }); }
function apiGetTareas(p)        { return callApiRaw('getTareas', p); }
function apiCreateTarea(d)      { return callApiRaw('createTarea', d); }
function apiUpdateTarea(d)      { return callApiRaw('updateTarea', d); }
function apiDeleteTarea(id)     { return callApiRaw('deleteTarea', { id: id }); }

function apiGetSprints(p)       { return callApiRaw('getSprints', p); }
function apiGetSprint(id)       { return callApiRaw('getSprintById', { id: id }); }
function apiCreateSprint(d)     { return callApiRaw('createSprint', d); }
function apiUpdateSprint(d)     { return callApiRaw('updateSprint', d); }
function apiCloseSprint(d)      { return callApiRaw('closeSprint', d); }
function apiDeleteSprint(id)    { return callApiRaw('deleteSprint', { id: id }); }

function apiGetComentarios(entidad, id)        { return callApiRaw('getComentarios', { entidad: entidad, id_entidad: id }); }
function apiCreateComentario(entidad, id, txt) { return callApiRaw('createComentario', { entidad: entidad, id_entidad: id, texto: txt }); }
function apiUpdateComentario(id, txt)          { return callApiRaw('updateComentario', { id: id, texto: txt }); }
function apiGetHistorial(entidad, id)          { return callApiRaw('getHistorial', { entidad: entidad, id_entidad: id }); }

function apiGetAdjuntos(entidad, id)           { return callApiRaw('getAdjuntos', { entidad: entidad, id_entidad: id }); }
function apiCreateAdjunto(payload)             { return callApiRaw('createAdjunto', payload); }
function apiDeleteAdjunto(id)                  { return callApiRaw('deleteAdjunto', { id: id }); }

function apiGetChecklist(entidad, id)          { return callApiRaw('getChecklist', { entidad: entidad, id_entidad: id }); }
function apiCreateChecklistItem(entidad, id, t){ return callApiRaw('createChecklistItem', { entidad: entidad, id_entidad: id, texto: t }); }
function apiToggleChecklistItem(id, hecho)     { return callApiRaw('toggleChecklistItem', { id: id, hecho: hecho }); }
function apiDeleteChecklistItem(id)            { return callApiRaw('deleteChecklistItem', { id: id }); }

function apiGetUsuarios()        { return callApiRaw('getUsuarios'); }
function apiGetUsuariosBasico()  { return callApiRaw('getUsuariosBasico'); }
function apiCreateUsuario(d)     { return callApiRaw('createUsuario', d); }
function apiUpdateUsuario(d)     { return callApiRaw('updateUsuario', d); }

function apiGetPermisos()        { return callApiRaw('getPermisos'); }
function apiUpdatePermisos(d)    { return callApiRaw('updatePermisos', d); }

function apiGetNotificaciones()               { return callApiRaw('getNotificaciones'); }
function apiMarkNotificacionLeida(id)         { return callApiRaw('markNotificacionLeida', { id: id }); }
function apiMarkAllNotificacionesLeidas()     { return callApiRaw('markAllNotificacionesLeidas'); }

function apiGetRoles()           { return callApiRaw('getRoles'); }
function apiCreateRol(d)         { return callApiRaw('createRol', d); }
function apiUpdateRol(d)         { return callApiRaw('updateRol', d); }

function apiUpdateCatalogo(catalogo, valores) { return callApiRaw('updateCatalogo', { catalogo: catalogo, valores: valores }); }

/* ─── CATÁLOGOS EDITABLES (CAT_*) ─────────────────────────
   Cache por página: los forms usan cat(key, fallback) en vez de la
   constante hardcodeada directamente, para reflejar ediciones hechas
   desde Configuración > Catálogos sin esperar un redeploy de código.
   Llamar loadCatalogos() (await) antes de armar cualquier <select>. */
let _catalogos = null;

async function loadCatalogos() {
  if (_catalogos) return _catalogos;
  try { _catalogos = await apiGetCatalogos(); }
  catch (e) { _catalogos = {}; }
  return _catalogos;
}

function cat(key, fallback) {
  const vals = _catalogos && _catalogos[key];
  return (vals && vals.length) ? vals : fallback;
}

/* ─── SELECTOR DE RESPONSABLE (usuarios reales) ──────────── */
// El responsable se guarda como nombre (string), compatible con datos migrados.
let _usuariosBasico = null;

async function loadUsuariosBasico() {
  if (_usuariosBasico) return _usuariosBasico;
  try { _usuariosBasico = await apiGetUsuariosBasico(); }
  catch (e) { _usuariosBasico = []; }
  return _usuariosBasico;
}

// Opciones <option> para un <select> de responsable: usuarios reales del
// sistema + nombres del catálogo CAT_RESPONSABLES (externos conocidos, ej.
// freelancers). Conserva el valor actual aunque no esté en ninguna lista
// (texto migrado de Jira) → "(externo)".
function responsableOptions(current) {
  const usuarios = (_usuariosBasico || []).map(function (u) { return u.nombre; });
  const catalogo = cat('responsables', []).filter(function (n) { return usuarios.indexOf(n) === -1; });
  const names = usuarios.concat(catalogo);
  let opts = '<option value="">— Sin asignar —</option>';
  if (current && names.indexOf(current) === -1) {
    opts += '<option value="' + escapeHtml(current) + '" selected>' + escapeHtml(current) + ' (externo)</option>';
  }
  opts += names.map(function (n) {
    return '<option value="' + escapeHtml(n) + '"' + (n === current ? ' selected' : '') + '>' + escapeHtml(n) + '</option>';
  }).join('');
  return opts;
}

/* ============================================================
   MODO DEMO (mock) — datos locales, CRUD en memoria.
   No persiste al recargar. Solo para ver la UI sin backend.
   ============================================================ */

let _mock = null;
let _mockPermisos = null;
let _mockRoles = null;

async function _mockLoad() {
  if (_mock) return _mock;
  const base = _assetBase();
  const fetchJson = function (path, fallback) {
    return fetch(base + path).then(function (r) { return r.ok ? r.json() : fallback; }).catch(function () { return fallback; });
  };
  const [proyectos, tareas, comentarios, historial, adjuntos, usuarios, checklist, sprints] = await Promise.all([
    fetchJson('src/data/proyectos.json', []),
    fetchJson('src/data/tareas.json', []),
    fetchJson('src/data/comentarios.json', []),
    fetchJson('src/data/historial.json', []),
    fetchJson('src/data/adjuntos.json', []),
    fetchJson('src/data/usuarios.json', []),
    fetchJson('src/data/checklist.json', []),
    fetchJson('src/data/sprints.json', []),
  ]);
  _mock = {
    proyectos: proyectos, tareas: tareas, comentarios: comentarios,
    historial: historial, adjuntos: adjuntos, usuarios: usuarios,
    checklist: checklist, sprints: sprints,
    catalogos: {
      CAT_ESTADOS_PROYECTO: ESTADOS_PROYECTO.slice(),
      CAT_ESTADOS_TAREA:    ESTADOS_TAREA.slice(),
      CAT_TIPOS_TAREA:      TIPOS_TAREA.slice(),
      CAT_PRIORIDADES:      PRIORIDADES.slice(),
      CAT_SITIOS:           SITIOS.slice(),
      CAT_AREAS:            AREAS.slice(),
      CAT_TIENDAS:          TIENDAS.slice(),
      CAT_SECCIONES:        SECCIONES.slice(),
      CAT_ESTADOS_SPRINT:   ESTADOS_SPRINT.slice(),
      CAT_RESPONSABLES:     [],
    },
  };
  return _mock;
}

// Base relativa según la profundidad (raíz vs modules/x/).
function _assetBase() {
  const tag = document.querySelector('script[src*="config.js"]');
  if (tag) return tag.getAttribute('src').replace('config.js', '');
  return '';
}

function _today() { return new Date().toISOString().slice(0, 10); }

// Roles demo: Administrador (sistema) + Agente (personalizado).
function _mockRolesInit() {
  if (_mockRoles) return;
  _mockRoles = [
    { id: 1, nombre: 'Administrador', descripcion: 'Acceso total. Rol del sistema.', activo: 'SI', es_sistema: 'SI' },
    { id: 2, nombre: 'Agente',        descripcion: 'Ve todos los módulos, sin edición.', activo: 'SI', es_sistema: 'NO' },
  ];
}

// Permisos demo del rol Agente (id=2): ve todo, no edita.
function _mockPermisosInit() {
  if (_mockPermisos) return;
  const mods = (typeof MODULOS_FRONT !== 'undefined') ? MODULOS_FRONT : [];
  _mockPermisos = mods.map(function (m) { return { id_rol: 2, modulo: m, puede_ver: 'SI', puede_editar: 'NO' }; });
}

function _mockAvance(pid) {
  const ts = _mock.tareas.filter(function (t) { return Number(t.id_proyecto) === Number(pid) && t.estado !== 'Cancelada'; });
  if (!ts.length) return 0;
  const done = ts.filter(function (t) { return t.estado === 'Finalizada'; }).length;
  return Math.round(done / ts.length * 100);
}

async function _mockCall(action, p) {
  await _mockLoad();
  const today = _today();

  switch (action) {
    case 'getCatalogos': {
      const mc = _mock.catalogos;
      return {
        estados_proyecto: mc.CAT_ESTADOS_PROYECTO, estados_tarea: mc.CAT_ESTADOS_TAREA,
        tipos_tarea: mc.CAT_TIPOS_TAREA, prioridades: mc.CAT_PRIORIDADES,
        sitios: mc.CAT_SITIOS, areas: mc.CAT_AREAS, tiendas: mc.CAT_TIENDAS,
        secciones: mc.CAT_SECCIONES, estados_sprint: mc.CAT_ESTADOS_SPRINT,
        responsables: mc.CAT_RESPONSABLES,
      };
    }
    case 'updateCatalogo': {
      if (!p.catalogo || !Array.isArray(p.valores) || !p.valores.length)
        throw new Error('Catálogo o valores inválidos');
      _mock.catalogos[p.catalogo] = p.valores.map(function(v) { return String(v).trim(); }).filter(Boolean);
      return { catalogo: p.catalogo, count: _mock.catalogos[p.catalogo].length };
    }

    case 'getActividadDiaria': {
      const fecha = p.fecha || today;
      const fechaHasta = p.fecha_hasta || fecha;
      const proyById = {};
      const tareaById = {};
      const sprintById = {};
      _mock.proyectos.forEach(function (x) { proyById[Number(x.id)] = x; });
      _mock.tareas.forEach(function (x) { tareaById[Number(x.id)] = x; });
      _mock.sprints.forEach(function (x) { sprintById[Number(x.id)] = x; });
      const dateKey = function (v) { return v ? String(v).slice(0, 10) : ''; };
      const enRango = function (v) { const k = dateKey(v); return k >= fecha && k <= fechaHasta; };
      const ref = function (entidad, idEntidad) {
        const id = Number(idEntidad);
        if (entidad === 'PROYECTO') {
          const pr = proyById[id];
          return { titulo: pr ? pr.nombre : 'Proyecto #' + id, proyecto: pr ? pr.nombre : '', id_proyecto: pr ? id : null };
        }
        if (entidad === 'TAREA') {
          const ta = tareaById[id];
          const pid = ta ? Number(ta.id_proyecto) : null;
          const pr = ta ? proyById[pid] : null;
          return { titulo: ta ? ta.titulo : 'Tarea #' + id, proyecto: pr ? pr.nombre : '', id_proyecto: pr ? pid : null, area: ta ? ta.area : '', url_informe: ta ? ta.url_informe_gestion : '' };
        }
        if (entidad === 'SPRINT') {
          const sp = sprintById[id];
          return { titulo: sp ? sp.nombre : 'Sprint #' + id, proyecto: '', id_proyecto: null };
        }
        return { titulo: entidad + ' #' + id, proyecto: '', id_proyecto: null };
      };
      const hora = function (v) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? '--:--' : d.toISOString().slice(11, 16);
      };
      const comentarios = _mock.comentarios
        .filter(function (c) { return enRango(c.fecha_creacion); })
        .map(function (c) {
          const r = ref(c.entidad, c.id_entidad);
          return { tipo: 'comentario', fecha: c.fecha_creacion, dia: dateKey(c.fecha_creacion), hora: hora(c.fecha_creacion), entidad: c.entidad, id_entidad: c.id_entidad, titulo: r.titulo, proyecto: r.proyecto, id_proyecto: r.id_proyecto, area: r.area || '', url_informe: r.url_informe || '', usuario: c.usuario, texto: c.texto };
        });
      const cambios = _mock.historial
        .filter(function (h) { return enRango(h.timestamp); })
        .map(function (h) {
          const r = ref(h.entidad, h.id_entidad);
          return { tipo: h.campo === 'estado' ? 'estado' : 'cambio', fecha: h.timestamp, dia: dateKey(h.timestamp), hora: hora(h.timestamp), entidad: h.entidad, id_entidad: h.id_entidad, titulo: r.titulo, proyecto: r.proyecto, id_proyecto: r.id_proyecto, area: r.area || '', url_informe: r.url_informe || '', usuario: h.usuario, campo: h.campo, valor_anterior: h.valor_anterior, valor_nuevo: h.valor_nuevo };
        });
      const items = comentarios.concat(cambios).sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
      return { fecha: fecha, fecha_hasta: fechaHasta, items: items };
    }

    case 'getResumen': {
      const proy = _mock.proyectos.filter(function (x) { return x.estado !== 'Cancelado'; });
      const tar = _mock.tareas.filter(function (x) { return x.estado !== 'Cancelada'; });
      const byEstado = function (arr) { const o = {}; arr.forEach(function (x) { o[x.estado] = (o[x.estado] || 0) + 1; }); return o; };
      return {
        proyectos: {
          total: proy.length,
          activos: proy.filter(function (x) { return ESTADOS_PROYECTO_CERRADOS.indexOf(x.estado) === -1; }).length,
          finalizados: proy.filter(function (x) { return x.estado === 'Finalizado'; }).length,
          vencidos: proy.filter(function (x) { return ESTADOS_PROYECTO_CERRADOS.indexOf(x.estado) === -1 && x.fecha_fin_estimada && x.fecha_fin_estimada.slice(0, 10) < today; }).length,
          por_estado: byEstado(proy),
        },
        tareas: {
          total: tar.length,
          vencidas: tar.filter(function (x) { return ESTADOS_TAREA_CERRADOS.indexOf(x.estado) === -1 && x.fecha_limite && x.fecha_limite.slice(0, 10) < today; }).length,
          por_estado: byEstado(tar),
        },
      };
    }

    case 'getProyectos': {
      let rows = _mock.proyectos.map(function (x) {
        return Object.assign({}, x, {
          avance_pct: _mockAvance(x.id),
          vencido: ESTADOS_PROYECTO_CERRADOS.indexOf(x.estado) === -1 && x.fecha_fin_estimada && x.fecha_fin_estimada.slice(0, 10) < today,
        });
      });
      if (p.incluir_cancelados !== true) rows = rows.filter(function (x) { return x.estado !== 'Cancelado'; });
      if (p.estado) rows = rows.filter(function (x) { return x.estado === p.estado; });
      return rows;
    }

    case 'getProyectoById': {
      const x = _mock.proyectos.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Proyecto no encontrado');
      return Object.assign({}, x, { avance_pct: _mockAvance(x.id) });
    }

    case 'createProyecto': {
      const id = Math.max(0, ...(_mock.proyectos.map(function (x) { return Number(x.id); }))) + 1;
      _mock.proyectos.push(Object.assign({ id: id, estado: 'Por Hacer', prioridad: 'Medium' }, p));
      return { id: id };
    }
    case 'updateProyecto': {
      const x = _mock.proyectos.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Proyecto no encontrado');
      Object.assign(x, p);
      return { id: x.id };
    }
    case 'deleteProyecto': {
      const x = _mock.proyectos.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (x) x.estado = 'Cancelado';
      return { id: p.id };
    }

    case 'getTareas': {
      let rows = _mock.tareas.map(function (x) {
        return Object.assign({}, x, {
          vencida: ESTADOS_TAREA_CERRADOS.indexOf(x.estado) === -1 && x.fecha_limite && x.fecha_limite.slice(0, 10) < today,
        });
      });
      if (p.id_proyecto) rows = rows.filter(function (x) { return Number(x.id_proyecto) === Number(p.id_proyecto); });
      if (p.incluir_canceladas !== true) rows = rows.filter(function (x) { return x.estado !== 'Cancelada'; });
      if (p.estado) rows = rows.filter(function (x) { return x.estado === p.estado; });
      if (p.id_sprint === 'backlog') rows = rows.filter(function (x) { return !x.id_sprint; });
      else if (p.id_sprint) rows = rows.filter(function (x) { return Number(x.id_sprint) === Number(p.id_sprint); });
      rows.sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
      return rows;
    }
    case 'createTarea': {
      const id = Math.max(0, ...(_mock.tareas.map(function (x) { return Number(x.id); }))) + 1;
      _mock.tareas.push(Object.assign({ id: id, estado: 'Por Hacer', tipo: 'Tarea', prioridad: 'Medium', avance_pct: 0 }, p));
      return { id: id };
    }
    case 'updateTarea': {
      const x = _mock.tareas.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Tarea no encontrada');
      if (x.estado === 'Documentaci\u00f3n' && p.estado === 'Finalizada') {
        throw new Error('No se puede pasar de Documentaci\u00f3n a Finalizada. Primero debe ir a Revisi\u00f3n.');
      }
      if (x.estado === 'Documentaci\u00f3n' && p.estado === 'Revisi\u00f3n' && !(p.url_informe_gestion || x.url_informe_gestion)) {
        throw new Error('Para pasar a Revisi\u00f3n una tarea documentada, carga la URL del informe de gestion del portal ecommerce.');
      }
      Object.assign(x, p);
      return { id: x.id };
    }
    case 'deleteTarea': {
      const x = _mock.tareas.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (x) x.estado = 'Cancelada';
      return { id: p.id };
    }

    case 'getSprints': {
      let rows = _mock.sprints.slice();
      if (p.estado) rows = rows.filter(function (x) { return x.estado === p.estado; });
      if (p.incluir_cancelados !== true) rows = rows.filter(function (x) { return x.estado !== 'Cancelado'; });
      rows.sort(function (a, b) {
        const fa = a.fecha_inicio ? String(a.fecha_inicio) : '9999';
        const fb = b.fecha_inicio ? String(b.fecha_inicio) : '9999';
        return fa < fb ? -1 : (fa > fb ? 1 : 0);
      });
      return rows;
    }
    case 'getSprintById': {
      const x = _mock.sprints.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Sprint no encontrado');
      return x;
    }
    case 'createSprint': {
      const id = Math.max(0, ...(_mock.sprints.map(function (x) { return Number(x.id); }))) + 1;
      _mock.sprints.push(Object.assign({ id: id, estado: 'Planificado' }, p));
      return { id: id };
    }
    case 'updateSprint': {
      const x = _mock.sprints.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Sprint no encontrado');
      Object.assign(x, p);
      return { id: x.id };
    }
    case 'closeSprint': {
      const x = _mock.sprints.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (!x) throw new Error('Sprint no encontrado');
      const destino = p.destino_tareas === undefined ? 'keep' : String(p.destino_tareas);
      let movidas = 0;
      if (destino !== 'keep') {
        const nuevo = destino === 'backlog' ? '' : Number(destino);
        _mock.tareas.forEach(function (t) {
          if (Number(t.id_sprint) === Number(p.id) && ESTADOS_TAREA_CERRADOS.indexOf(t.estado) === -1) {
            t.id_sprint = nuevo;
            movidas++;
          }
        });
      }
      x.estado = 'Cerrado';
      return { id: x.id, movidas: movidas, destino: destino };
    }
    case 'deleteSprint': {
      const x = _mock.sprints.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (x) x.estado = 'Cancelado';
      return { id: p.id };
    }

    case 'getComentarios': {
      return _mock.comentarios
        .filter(function (c) { return c.entidad === p.entidad && Number(c.id_entidad) === Number(p.id_entidad); })
        .sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
    }
    case 'createComentario': {
      const id = Math.max(0, ...(_mock.comentarios.map(function (c) { return Number(c.id); }))) + 1;
      _mock.comentarios.push({ id: id, entidad: p.entidad, id_entidad: Number(p.id_entidad), texto: p.texto, usuario: 'demo@local', fecha_creacion: new Date().toISOString(), fecha_edicion: null });
      return { id: id };
    }
    case 'updateComentario': {
      const c = _mock.comentarios.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (!c) throw new Error('Comentario no encontrado');
      c.texto = p.texto;
      c.fecha_edicion = new Date().toISOString();
      return { id: c.id };
    }
    case 'getHistorial': {
      return _mock.historial
        .filter(function (h) { return h.entidad === p.entidad && Number(h.id_entidad) === Number(p.id_entidad); })
        .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    }

    case 'getAdjuntos': {
      return _mock.adjuntos
        .filter(function (a) { return a.entidad === p.entidad && Number(a.id_entidad) === Number(p.id_entidad); })
        .sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
    }
    case 'createAdjunto': {
      const id = Math.max(0, ...(_mock.adjuntos.map(function (a) { return Number(a.id); }))) + 1;
      // En demo, la miniatura es el propio data URL subido (sin Drive).
      const dataUrl = 'data:' + p.mime + ';base64,' + p.data_base64;
      const adj = { id: id, entidad: p.entidad, id_entidad: Number(p.id_entidad), nombre_archivo: p.nombre_archivo, file_id: 'demo-' + id, url: dataUrl, thumbnail_url: dataUrl, mime: p.mime, tamano: Math.round(p.data_base64.length * 0.75), subido_por: 'demo@local', fecha_creacion: new Date().toISOString() };
      _mock.adjuntos.push(adj);
      return adj;
    }
    case 'deleteAdjunto': {
      _mock.adjuntos = _mock.adjuntos.filter(function (a) { return Number(a.id) !== Number(p.id); });
      return { id: p.id };
    }

    case 'getChecklist': {
      return _mock.checklist
        .filter(function (c) { return c.entidad === p.entidad && Number(c.id_entidad) === Number(p.id_entidad); })
        .sort(function (a, b) { return (Number(a.orden) || 0) - (Number(b.orden) || 0); });
    }
    case 'createChecklistItem': {
      const id = Math.max(0, ...(_mock.checklist.map(function (c) { return Number(c.id); }))) + 1;
      const mismos = _mock.checklist.filter(function (c) { return c.entidad === p.entidad && Number(c.id_entidad) === Number(p.id_entidad); });
      const orden = mismos.reduce(function (m, c) { return Math.max(m, Number(c.orden) || 0); }, 0) + 1;
      _mock.checklist.push({ id: id, entidad: p.entidad, id_entidad: Number(p.id_entidad), texto: p.texto, hecho: 'NO', orden: orden, fecha_creacion: new Date().toISOString(), creado_por: 'demo@local' });
      return { id: id };
    }
    case 'toggleChecklistItem': {
      const c = _mock.checklist.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (!c) throw new Error('Ítem no encontrado');
      c.hecho = (p.hecho === true || p.hecho === 'SI') ? 'SI' : 'NO';
      return { id: c.id, hecho: c.hecho };
    }
    case 'deleteChecklistItem': {
      _mock.checklist = _mock.checklist.filter(function (c) { return Number(c.id) !== Number(p.id); });
      return { id: p.id };
    }

    case 'getUsuarios': {
      return _mock.usuarios.map(function (u) { return Object.assign({}, u); });
    }
    case 'getUsuariosBasico': {
      return _mock.usuarios.filter(function (u) { return u.activo === 'SI'; })
        .map(function (u) { return { id: u.id, nombre: u.nombre, email: u.email }; });
    }
    case 'createUsuario': {
      const id = Math.max(0, ...(_mock.usuarios.map(function (u) { return Number(u.id); }))) + 1;
      _mockRolesInit();
      const r = _mockRoles.filter(function (x) { return Number(x.id) === Number(p.id_rol); })[0];
      _mock.usuarios.push({ id: id, nombre: p.nombre, email: (p.email || '').toLowerCase(), id_rol: Number(p.id_rol) || 2, nombre_rol: r ? r.nombre : 'Rol ' + p.id_rol, activo: 'SI', fecha_creacion: new Date().toISOString(), ultimo_acceso: '' });
      return { id: id };
    }
    case 'updateUsuario': {
      const u = _mock.usuarios.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (!u) throw new Error('Usuario no encontrado');
      _mockRolesInit();
      if (p.nombre !== undefined) u.nombre = p.nombre;
      if (p.email !== undefined) u.email = (p.email || '').toLowerCase();
      if (p.id_rol !== undefined) {
        u.id_rol = Number(p.id_rol);
        const r = _mockRoles.filter(function (x) { return Number(x.id) === u.id_rol; })[0];
        u.nombre_rol = r ? r.nombre : 'Rol ' + u.id_rol;
      }
      if (p.activo !== undefined) u.activo = p.activo === 'SI' ? 'SI' : 'NO';
      return { id: u.id };
    }

    case 'getRoles': {
      _mockRolesInit();
      return _mockRoles.map(function (r) { return Object.assign({}, r); });
    }
    case 'createRol': {
      _mockRolesInit();
      const id = Math.max(0, ...(_mockRoles.map(function (r) { return Number(r.id); }))) + 1;
      _mockRoles.push({ id: id, nombre: p.nombre, descripcion: p.descripcion || 'Rol personalizado.', activo: 'SI', es_sistema: 'NO' });
      const mods = (typeof MODULOS_FRONT !== 'undefined') ? MODULOS_FRONT : [];
      if (!_mockPermisos) _mockPermisos = [];
      mods.forEach(function (m) { _mockPermisos.push({ id_rol: id, modulo: m, puede_ver: 'NO', puede_editar: 'NO' }); });
      return { id: id };
    }
    case 'updateRol': {
      _mockRolesInit();
      const r = _mockRoles.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (!r) throw new Error('Rol no encontrado');
      if (String(r.es_sistema) === 'SI') throw new Error('El rol del sistema no se puede modificar');
      if (p.nombre !== undefined) r.nombre = p.nombre;
      if (p.descripcion !== undefined) r.descripcion = p.descripcion;
      if (p.activo !== undefined) r.activo = p.activo === 'SI' ? 'SI' : 'NO';
      return { id: r.id };
    }

    case 'getPermisos': {
      _mockPermisosInit();
      return _mockPermisos.map(function (r) { return Object.assign({}, r); });
    }
    case 'updatePermisos': {
      _mockPermisosInit();
      let ver = (p.puede_ver === 'SI' || p.puede_ver === true) ? 'SI' : 'NO';
      let edt = (p.puede_editar === 'SI' || p.puede_editar === true) ? 'SI' : 'NO';
      if (ver === 'NO') edt = 'NO';
      const row = _mockPermisos.filter(function (r) { return Number(r.id_rol) === Number(p.id_rol) && r.modulo === p.modulo; })[0];
      if (row) { row.puede_ver = ver; row.puede_editar = edt; }
      else _mockPermisos.push({ id_rol: Number(p.id_rol), modulo: p.modulo, puede_ver: ver, puede_editar: edt });
      return { ok: true };
    }

    case 'getNotificaciones': {
      _mockNotifInit();
      const items = _mockNotif.slice()
        .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
        .slice(0, 30);
      const noLeidas = _mockNotif.filter(function (n) { return String(n.leida) !== 'SI'; }).length;
      return { items: items, no_leidas: noLeidas };
    }
    case 'markNotificacionLeida': {
      _mockNotifInit();
      const n = _mockNotif.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (n) n.leida = 'SI';
      return { id: p.id };
    }
    case 'markAllNotificacionesLeidas': {
      _mockNotifInit();
      let count = 0;
      _mockNotif.forEach(function (n) { if (String(n.leida) !== 'SI') { n.leida = 'SI'; count++; } });
      return { count: count };
    }

    default: throw new Error('Acción demo no soportada: ' + action);
  }
}

// Notificaciones demo: datos de ejemplo para ver la campana sin backend.
let _mockNotif = null;
function _mockNotifInit() {
  if (_mockNotif) return;
  const now = Date.now();
  const ago = function (min) { return new Date(now - min * 60000).toISOString(); };
  _mockNotif = [
    { id: 3, timestamp: ago(15),   destinatario: 'Demo', tipo: 'MENCION',    entidad: 'TAREA', id_entidad: 1, mensaje: 'Ana te mencionó en un comentario', origen: 'Ana', leida: 'NO' },
    { id: 2, timestamp: ago(120),  destinatario: 'Demo', tipo: 'ASIGNACION', entidad: 'TAREA', id_entidad: 2, mensaje: 'Carlos te asignó la tarea "Ajustar PDP"', origen: 'Carlos', leida: 'NO' },
    { id: 1, timestamp: ago(1440), destinatario: 'Demo', tipo: 'ESTADO',     entidad: 'TAREA', id_entidad: 1, mensaje: 'La tarea "Home responsive" cambió a estado QA', origen: 'Carlos', leida: 'SI' },
  ];
}
