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
  const str = String(value == null ? '' : value).replace(/"/g, '""');
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

function apiGetComentarios(entidad, id)        { return callApiRaw('getComentarios', { entidad: entidad, id_entidad: id }); }
function apiCreateComentario(entidad, id, txt) { return callApiRaw('createComentario', { entidad: entidad, id_entidad: id, texto: txt }); }
function apiGetHistorial(entidad, id)          { return callApiRaw('getHistorial', { entidad: entidad, id_entidad: id }); }

function apiGetAdjuntos(entidad, id)           { return callApiRaw('getAdjuntos', { entidad: entidad, id_entidad: id }); }
function apiCreateAdjunto(payload)             { return callApiRaw('createAdjunto', payload); }
function apiDeleteAdjunto(id)                  { return callApiRaw('deleteAdjunto', { id: id }); }

/* ============================================================
   MODO DEMO (mock) — datos locales, CRUD en memoria.
   No persiste al recargar. Solo para ver la UI sin backend.
   ============================================================ */

let _mock = null;

async function _mockLoad() {
  if (_mock) return _mock;
  const base = _assetBase();
  const fetchJson = function (path, fallback) {
    return fetch(base + path).then(function (r) { return r.ok ? r.json() : fallback; }).catch(function () { return fallback; });
  };
  const [proyectos, tareas, comentarios, historial, adjuntos] = await Promise.all([
    fetchJson('src/data/proyectos.json', []),
    fetchJson('src/data/tareas.json', []),
    fetchJson('src/data/comentarios.json', []),
    fetchJson('src/data/historial.json', []),
    fetchJson('src/data/adjuntos.json', []),
  ]);
  _mock = { proyectos: proyectos, tareas: tareas, comentarios: comentarios, historial: historial, adjuntos: adjuntos };
  return _mock;
}

// Base relativa según la profundidad (raíz vs modules/x/).
function _assetBase() {
  const tag = document.querySelector('script[src*="config.js"]');
  if (tag) return tag.getAttribute('src').replace('config.js', '');
  return '';
}

function _today() { return new Date().toISOString().slice(0, 10); }

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
    case 'getCatalogos':
      return {
        estados_proyecto: ESTADOS_PROYECTO, estados_tarea: ESTADOS_TAREA,
        tipos_tarea: TIPOS_TAREA, prioridades: PRIORIDADES, sitios: SITIOS,
        areas: AREAS, tiendas: TIENDAS,
        responsables: [],
      };

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
      Object.assign(x, p);
      return { id: x.id };
    }
    case 'deleteTarea': {
      const x = _mock.tareas.filter(function (r) { return Number(r.id) === Number(p.id); })[0];
      if (x) x.estado = 'Cancelada';
      return { id: p.id };
    }

    case 'getComentarios': {
      return _mock.comentarios
        .filter(function (c) { return c.entidad === p.entidad && Number(c.id_entidad) === Number(p.id_entidad); })
        .sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
    }
    case 'createComentario': {
      const id = Math.max(0, ...(_mock.comentarios.map(function (c) { return Number(c.id); }))) + 1;
      _mock.comentarios.push({ id: id, entidad: p.entidad, id_entidad: Number(p.id_entidad), texto: p.texto, usuario: 'demo@local', fecha_creacion: new Date().toISOString() });
      return { id: id };
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

    default: throw new Error('Acción demo no soportada: ' + action);
  }
}
