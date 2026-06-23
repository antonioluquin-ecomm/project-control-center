/* ============================================================
   PROJECT CONTROL CENTER — config.js
   Configuración global, constantes, estado y theme.
   Cargar primero, antes de auth.js y api.js.
   ============================================================ */

'use strict';

/* ─── VERSIÓN ─────────────────────────────────────────────── */

const VERSION = {
  number: '1.6.2',
  date:   '2026-06-23',
  notes:  'Layout: los m�dulos utilizan todo el ancho disponible del �rea de contenido.',
};

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

const CFG = {
  get apiUrl()  { return localStorage.getItem('pcc_api_url') || ''; },
  set apiUrl(v) { localStorage.setItem('pcc_api_url', v); },

  isMock() { return !this.apiUrl; },
};

/* ─── THEME ───────────────────────────────────────────────── */

const THEME_KEY = 'pcc_theme';

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = next === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  setTheme(getCurrentTheme() === 'light' ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(saved);
}
