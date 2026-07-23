/* ============================================================
   PROJECT CONTROL CENTER — config.js
   Configuración global, constantes, estado y theme.
   Cargar primero, antes de auth.js y api.js.
   ============================================================ */

'use strict';

/* ─── VERSIÓN ─────────────────────────────────────────────── */

const VERSION = {
  number: '1.27.5',
  date:   '2026-07-23',
  notes:  'Nuevo logo de marca (barras ascendentes) en sidebar, login y favicon',
};

/* Máximo 10 entradas (project-standards/application_shell.md §8.5) — descripción breve,
 * de una línea. Al agregar una versión nueva, quitar la más antigua del final. */
const CHANGELOG = [
  { v: '1.27.5', date: '2026-07-23', desc: 'Nuevo logo de marca (barras ascendentes) en sidebar, login y favicon.' },
  { v: '1.27.4', date: '2026-07-21', desc: 'Modal de usuario: mostrar/ocultar contraseña y botón "Generar".' },
  { v: '1.27.3', date: '2026-07-21', desc: 'Label visible en filtros de Gantt, Proyectos y Configuración.' },
  { v: '1.27.2', date: '2026-07-21', desc: 'Tareas: label visible en cada control de la barra de filtros.' },
  { v: '1.27.1', date: '2026-07-21', desc: 'Fix de altura de la celda Acciones en filas con contenido extra.' },
  { v: '1.27.0', date: '2026-07-21', desc: 'Tareas: nuevo campo "Documentación" (URL) en la sección Links.' },
  { v: '1.26.9', date: '2026-07-21', desc: 'Badge "Vencida" pasa de rojo a ámbar y se reubica junto a la fecha.' },
  { v: '1.26.8', date: '2026-07-21', desc: 'Badge de tienda usa el color de marca real (Sporting/Woker/B2B).' },
  { v: '1.26.7', date: '2026-07-21', desc: 'Formato de descripciones: título y subtítulo se distinguen mejor.' },
  { v: '1.26.6', date: '2026-07-21', desc: 'Actividad: campana de notificaciones alineada a la derecha, con filtros.' },
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
const ESTADOS_SPRINT   = ['Planificado', 'Activo', 'Cerrado', 'Cancelado'];
const ESTADOS_SPRINT_CERRADOS = ['Cerrado', 'Cancelado'];

// S6: dimensiones de tarea. Área = equipo que ejecuta (≠ responsable persona).
const AREAS            = ['Ecom', 'InfraCommerce', 'PIM'];
const TIENDAS          = ['Sporting', 'Woker', 'B2B'];

// Qué enlace externo corresponde a cada área.
const AREA_LINK = {
  'InfraCommerce': 'url_jira',
  'PIM':           'url_gitlab',
};

// Dimensiones reutilizables (Informe de Gestión / Requerimiento).
// Sin UI de administración todavía (igual que TIENDAS): para ampliar la lista,
// editar directamente la hoja CAT_SECCIONES en el Sheet.
const SECCIONES    = ['PLP', 'PDP', 'Home', 'Checkout', 'Carrito', 'Cuenta', 'Buscador', 'Otro'];
const DISPOSITIVOS = ['Mobile', 'Tablet', 'Desktop'];

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

const ESTADO_CLASS_SPRINT = {
  'Planificado': 'st-todo',
  'Activo':      'st-progress',
  'Cerrado':     'st-done',
  'Cancelado':   'st-cancel',
};

const PRIORIDAD_CLASS = {
  'Highest': 'pr-highest',
  'High':    'pr-high',
  'Medium':  'pr-medium',
  'Low':     'pr-low',
  'Lowest':  'pr-lowest',
};

// Colores de marca por tienda (ver templates de correos transaccionales para el
// origen de cada tono). Tiendas sin mapeo caen en el badge gris genérico (st-todo).
const TIENDA_CLASS = {
  'Sporting': 'tienda-sporting',
  'Woker':    'tienda-woker',
  'B2B':      'tienda-b2b',
};

/* ─── ESTADO GLOBAL ───────────────────────────────────────── */

const STATE = {
  proyectos: [],
  tareas:    [],
  sprints:   [],
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
