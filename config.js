/* ============================================================
   PROJECT CONTROL CENTER — config.js
   Configuración global, constantes, estado y theme.
   Cargar primero, antes de auth.js y api.js.
   ============================================================ */

'use strict';

/* ─── VERSIÓN ─────────────────────────────────────────────── */

const VERSION = {
  number: '1.9.3',
  date:   '2026-06-29',
  notes:  'Tareas: fila clickeable abre modal de detalle con actividad embebida',
};

const CHANGELOG = [
  { v: '1.9.3', date: '2026-06-29', desc: 'Tareas: clic en fila abre modal de detalle — info completa + actividad (comentarios, checklist, adjuntos, historial) embebida; editar desde el detalle funciona con "Todos los proyectos"' },
  { v: '1.9.2', date: '2026-06-29', desc: 'Proyectos: filtro de responsable en toolbar; Tareas: label mejorado en filtro de resp.' },
  { v: '1.9.1', date: '2026-06-29', desc: 'Tareas: opción "Todos los proyectos" en el selector — carga todas las tareas; + Nueva tarea se deshabilita al seleccionar "Todos"' },
  { v: '1.9.0', date: '2026-06-29', desc: 'Comentarios: edición inline del texto propio — botón Editar en hover, textarea inline con Guardar/Cancelar, badge (editado); backend valida autoría' },
  { v: '1.8.1', date: '2026-06-29', desc: 'Checklist: checkbox custom, hover states, botón eliminar oculto, barra de progreso con gradiente y clase chk-complete al 100%' },
  { v: '1.8.0', date: '2026-06-29', desc: 'Colapso de sidebar en desktop — botón en topbar, estado persistido en localStorage (pcc_sidebar), anti-flash en los 7 HTML' },
  { v: '1.7.0', date: '2026-06-28', desc: 'Navegación alineada al estándar Luquin — área de usuario como chip compacto + dropdown (reemplaza botones apilados en el footer); elimina renderUserChip muerto (topbar); tab de admin "Conexión" → "Integraciones"' },
  { v: '1.6.4', date: '2026-06-23', desc: 'Shell: área de usuario en sidebar footer con rol, cambiar contraseña y logout' },
  { v: '1.6.3', date: '2026-06-23', desc: 'Shell: version badge con popover changelog en sidebar brand de todas las páginas' },
  { v: '1.6.2', date: '2026-06-23', desc: 'Layout — módulos utilizan todo el ancho disponible del área de contenido' },
  { v: '1.6.1', date: '2026-06-20', desc: 'S11 — mejoras módulo tareas: edición inline, filtros avanzados' },
  { v: '1.6.0', date: '2026-06-18', desc: 'S10 — pulido: filtros, reportes por área/tienda, quick-create' },
  { v: '1.5.0', date: '2026-06-15', desc: 'S9 — vista Gantt interactiva' },
  { v: '1.4.0', date: '2026-06-10', desc: 'S8 — checklists de subtareas + tipo Subtarea deprecado' },
];

function initVersionBadge() {
  const span    = document.getElementById('sidebarVersion');
  const btn     = document.getElementById('sidebarVersionBtn');
  const popover = document.getElementById('versionPopover');
  if (!span) return;
  span.textContent = `v${VERSION.number}`;
  if (!btn || !popover || !CHANGELOG.length) return;
  popover.innerHTML =
    '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid var(--sidebar-line)">Historial de cambios</div>'
    + CHANGELOG.map(c =>
      `<div style="margin-bottom:8px;">`
      + `<span style="font-weight:600;font-size:13px;">v${c.v}</span>`
      + `<span style="color:var(--muted);font-size:11px;margin-left:6px;">${c.date}</span>`
      + `<div style="font-size:12px;margin-top:2px;line-height:1.4;">${c.desc}</div>`
      + `</div>`
    ).join('');
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    popover.style.display = popover.style.display !== 'none' ? 'none' : 'block';
  });
  document.addEventListener('click', function() { popover.style.display = 'none'; });
}

/* ─── DOMINIOS (espejo de apps-script/Config.gs) ──────────── */

const ESTADOS_PROYECTO = ['Por Hacer', 'En Análisis', 'En Curso', 'Bloqueado', 'Finalizado', 'Cancelado'];
const ESTADOS_TAREA    = ['Por Hacer', 'En Análisis', 'Maquetación', 'En Curso', 'QA', 'Documentación', 'Revisión', 'Bloqueada', 'Finalizada', 'Cancelada'];
// 'Subtarea' deprecada (S8: reemplazada por checklist). No se ofrece para tareas
// nuevas; las migradas conservan su tipo (ver tipoOptions() en tareas.html).
const TIPOS_TAREA      = ['Historia', 'Tarea', 'Error'];
const PRIORIDADES      = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const SITIOS           = ['Sporting', 'Woker', 'PIM', 'B2B', 'Todos'];

// S6: dimensiones de tarea. Área = equipo que ejecuta (≠ responsable persona).
const AREAS            = ['Ecom', 'InfraCommerce', 'PIM'];
const TIENDAS          = ['Sporting', 'Woker', 'B2B'];

// Qué enlace externo corresponde a cada área.
const AREA_LINK = {
  'InfraCommerce': 'url_jira',
  'PIM':           'url_gitlab',
};

const ESTADOS_PROYECTO_CERRADOS = ['Finalizado', 'Cancelado'];
const ESTADOS_TAREA_CERRADOS    = ['Finalizada', 'Cancelada'];

// Clase CSS de badge por estado (definidas en main.css).
const ESTADO_CLASS = {
  'Por Hacer':     'st-todo',
  'En Análisis':   'st-analysis',
  'Maquetación':   'st-maquetacion',
  'En Curso':      'st-progress',
  'QA':            'st-qa',
  'Documentación': 'st-docs',
  'Revisión':      'st-revision',
  'Bloqueado':     'st-blocked',
  'Bloqueada':     'st-blocked',
  'Finalizado':    'st-done',
  'Finalizada':    'st-done',
  'Cancelado':     'st-cancel',
  'Cancelada':     'st-cancel',
};

const PRIORIDAD_CLASS = {
  'Highest': 'pr-highest',
  'High':    'pr-high',
  'Medium':  'pr-medium',
  'Low':     'pr-low',
  'Lowest':  'pr-lowest',
};

/* ─── ESTADO GLOBAL ───────────────────────────────────────── */

const STATE = {
  proyectos: [],
  tareas:    [],
  usuarios:  [],
  catalogos: null,
  resumen:   null,
  filtros:   { estado: '', responsable: '', sitio: '', q: '' },
};

/* ─── CONFIG (localStorage) ───────────────────────────────── */

// URL canónica del Web App de Apps Script. Pegá acá la URL del deploy de pcc
// para que la app funcione out-of-the-box; queda vacía = modo demo por defecto.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw6rZf-6EJrLN3aJ3aCxOzjNrv6j5PcfAJjpvu8BZ3am1r0F3WKvgOT2qH_4w3GiZ3sQ/exec';

const CFG = {
  // Override de localStorage (opcional) → si no, la constante canónica.
  get apiUrl()  { return localStorage.getItem('pcc_api_url') || APPS_SCRIPT_URL; },
  set apiUrl(v) { if (v) { localStorage.setItem('pcc_api_url', v); } else { localStorage.removeItem('pcc_api_url'); } },

  // Modo demo (datos locales): solo con flag explícito o sin URL efectiva.
  isMock() {
    if (localStorage.getItem('pcc_demo') === '1') return true;
    if (/[?&]demo=1\b/.test(location.search)) return true;
    return !this.apiUrl;
  },
};

/* ─── THEME ───────────────────────────────────────────────── */

const THEME_KEY = 'pcc_theme';

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function _updateThemeToggles(theme) {
  var t = theme || document.documentElement.getAttribute('data-theme') || 'light';
  var isLight = t === 'light';
  document.querySelectorAll('.th-icon').forEach(function(el) {
    el.textContent = isLight ? '☾' : '☀';
  });
  document.querySelectorAll('.th-label').forEach(function(el) {
    el.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  });
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  _updateThemeToggles(next);
}

function toggleTheme() {
  setTheme(getCurrentTheme() === 'light' ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(saved);
}
