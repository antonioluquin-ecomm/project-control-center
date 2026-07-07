// ============================================================
// PROJECT CONTROL CENTER — Config.gs
// Solo constantes: nombres de hojas, mapas de columnas y dominios.
// Sin funciones (apps_script_standards §2.4).
// ============================================================

const SHEETS = {
  PROYECTOS:   'PROYECTOS',
  TAREAS:      'TAREAS',
  SPRINTS:     'SPRINTS',
  COMENTARIOS: 'COMENTARIOS',
  ADJUNTOS:    'ADJUNTOS',
  CHECKLIST:   'CHECKLIST',
  HISTORIAL:   'HISTORIAL',
  USUARIOS:    'USUARIOS',
  SESIONES:    'SESIONES',
  ROLES:       'ROLES',
  PERMISOS_MODULOS: 'PERMISOS_MODULOS',
  LOGS:        'LOGS',
  ERRORS:      'ERRORS',
  CONFIG:      'CONFIG',
  CAT_ESTADOS_PROYECTO: 'CAT_ESTADOS_PROYECTO',
  CAT_ESTADOS_TAREA:    'CAT_ESTADOS_TAREA',
  CAT_ESTADOS_SPRINT:   'CAT_ESTADOS_SPRINT',
  CAT_TIPOS_TAREA:      'CAT_TIPOS_TAREA',
  CAT_PRIORIDADES:      'CAT_PRIORIDADES',
  CAT_RESPONSABLES:     'CAT_RESPONSABLES',
  CAT_SITIOS:           'CAT_SITIOS',
  CAT_AREAS:            'CAT_AREAS',
  CAT_TIENDAS:          'CAT_TIENDAS',
};

// ── MAPAS DE COLUMNAS (1-indexed para getRange) ───────────────
// Contrato Sheet ↔ código. Agregar columnas SOLO al final.

const PROYECTOS_COLS = {
  id:                 1,   // A
  nombre:             2,   // B
  descripcion:        3,   // C
  estado:             4,   // D
  prioridad:          5,   // E
  responsable:        6,   // F
  sitio:              7,   // G
  fecha_inicio:       8,   // H
  fecha_fin_estimada: 9,   // I
  observaciones:      10,  // J
  fecha_creacion:     11,  // K
  fecha_modificacion: 12,  // L
  creado_por:         13,  // M
  modificado_por:     14,  // N
};

const TAREAS_COLS = {
  id:                 1,   // A
  id_proyecto:        2,   // B
  titulo:             3,   // C
  descripcion:        4,   // D
  tipo:               5,   // E
  estado:             6,   // F
  prioridad:          7,   // G
  responsable:        8,   // H
  fecha_inicio:       9,   // I
  fecha_limite:       10,  // J
  avance_pct:         11,  // K
  orden:              12,  // L
  fecha_creacion:     13,  // M
  fecha_modificacion: 14,  // N
  creado_por:         15,  // O
  modificado_por:     16,  // P
  // ── S6: dimensiones y enlaces externos (append al final) ──
  area:               17,  // Q  — Ecom | InfraCommerce | PIM
  tienda:             18,  // R  — Sporting | Woker | B2B
  url_jira:           19,  // S  — enlace Jira (cuando area = InfraCommerce)
  url_gitlab:         20,  // T  — enlace GitLab (cuando area = PIM)
  url_figma_prototipo: 21, // U  — prototipo Figma (maquetación)
  url_figma_editable:  22, // V  — editable Figma (maquetación)
  // ── Sprints (append al final) ──
  id_sprint:          23,  // W  — FK → SPRINTS.id (nullable; '' = sin sprint)
  url_informe_gestion: 24, // X  - informe de gestion del portal ecommerce
};

// Sprints globales (multi-proyecto): agrupan TAREAS por id_sprint.
const SPRINTS_COLS = {
  id:                 1,   // A
  nombre:             2,   // B
  objetivo:           3,   // C  — meta del sprint (opcional)
  estado:             4,   // D  — Planificado | Activo | Cerrado | Cancelado
  fecha_inicio:       5,   // E
  fecha_fin:          6,   // F
  fecha_creacion:     7,   // G
  fecha_modificacion: 8,   // H
  creado_por:         9,   // I
  modificado_por:     10,  // J
};

const COMENTARIOS_COLS = {
  id:             1,
  entidad:        2,   // PROYECTO | TAREA
  id_entidad:     3,
  texto:          4,
  usuario:        5,
  fecha_creacion: 6,
  fecha_edicion:  7,   // null si no fue editado
};

const ADJUNTOS_COLS = {
  id:             1,
  entidad:        2,
  id_entidad:     3,
  nombre_archivo: 4,
  file_id:        5,
  url:            6,
  thumbnail_url:  7,
  mime:           8,
  tamano:         9,
  subido_por:     10,
  fecha_creacion: 11,
};

const HISTORIAL_COLS = {
  id:             1,
  timestamp:      2,
  entidad:        3,
  id_entidad:     4,
  campo:          5,
  valor_anterior: 6,
  valor_nuevo:    7,
  usuario:        8,
};

const CHECKLIST_COLS = {
  id:             1,
  entidad:        2,   // PROYECTO | TAREA
  id_entidad:     3,
  texto:          4,
  hecho:          5,   // SI | NO
  orden:          6,
  fecha_creacion: 7,
  creado_por:     8,
};

const USUARIOS_COLS = {
  id:             1,
  nombre:         2,
  email:          3,
  password_hash:  4,
  salt:           5,
  id_rol:         6,
  activo:         7,
  fecha_creacion: 8,
  ultimo_acceso:  9,
  creado_por:     10,
};

// ── ROLES ─────────────────────────────────────────────────────
// RBAC por módulo (canónico CLAUDE.md — modelo flexible):
//   1 = Administrador (es_sistema=SI): acceso total, no se renombra ni desactiva.
//   resto = roles personalizados (es_sistema=NO): creables/editables desde la UI,
//   con permisos por módulo en 3 estados (Oculto / Solo ver / Ver + editar).
const ROL_ADMIN  = 1;            // rol de sistema (Administrador)
const ROL_AGENTE = 2;            // legacy: id del rol semilla no-admin (compat seed)

const ROLES_COLS = {
  id:          1,
  nombre:      2,
  descripcion: 3,
  activo:      4,
  es_sistema:  5,
};

const PERMISOS_MODULOS_COLS = {
  id_rol:       1,
  modulo:       2,
  puede_ver:    3,
  puede_editar: 4,
};

// Módulos gobernados por PERMISOS_MODULOS (coinciden con las páginas del frontend).
const MODULOS = ['proyectos', 'tareas', 'seguimiento', 'reportes', 'gantt'];

// Etiquetas legibles de cada módulo (espejo en el frontend).
const MODULO_LABELS = {
  proyectos: 'Proyectos', tareas: 'Tareas', seguimiento: 'Seguimiento',
  reportes: 'Reportes', gantt: 'Gantt',
};

// Mapea cada acción de escritura de dominio a los módulos que la habilitan.
// El router permite la escritura si el rol tiene puede_editar=SI en ALGUNO de
// esos módulos (el Administrador siempre puede). Las acciones que no figuran acá
// son de colaboración (cualquier sesión) o de gestión (solo Administrador).
const ACTION_MODULE_MAP = {
  createProyecto: ['proyectos'], updateProyecto: ['proyectos'], deleteProyecto: ['proyectos'],
  createTarea:    ['tareas'],    updateTarea:    ['tareas'],    deleteTarea:    ['tareas'],
  createChecklistItem: ['proyectos', 'tareas'],
  toggleChecklistItem: ['proyectos', 'tareas'],
  deleteChecklistItem: ['proyectos', 'tareas'],
  deleteAdjunto:       ['proyectos', 'tareas'],
  // Sprints: se gestionan desde el módulo tareas.
  createSprint:   ['tareas'], updateSprint: ['tareas'], deleteSprint: ['tareas'],
};

// ── DOMINIOS CONTROLADOS ──────────────────────────────────────
// Replican las hojas CAT_ (google_sheets_standards §7.2).

const ESTADOS_PROYECTO = ['Por Hacer', 'En Análisis', 'En Curso', 'Bloqueado', 'Finalizado', 'Cancelado'];
const ESTADOS_TAREA    = ['Por Hacer', 'En Análisis', 'Maquetación', 'En Curso', 'QA', 'Documentación', 'Revisión', 'Bloqueada', 'Finalizada', 'Cancelada'];
// 'Subtarea' es legacy (S8: reemplazada por CHECKLIST). Se mantiene como valor
// válido para no romper la edición de tareas migradas, pero el frontend ya no
// la ofrece para tareas nuevas.
const TIPOS_TAREA      = ['Historia', 'Tarea', 'Error', 'Subtarea'];
const PRIORIDADES      = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const SITIOS           = ['Sporting', 'Woker', 'PIM', 'B2B', 'Todos'];
const ESTADOS_SPRINT   = ['Planificado', 'Activo', 'Cerrado', 'Cancelado'];

// ── S6: dimensiones de tarea ──────────────────────────────────
// Área responsable (equipo que ejecuta) — distinta del responsable (persona).
const AREAS            = ['Ecom', 'InfraCommerce', 'PIM'];
// Tienda a la que corresponde la tarea.
const TIENDAS          = ['Sporting', 'Woker', 'B2B'];

// Entidades válidas para COMENTARIOS / ADJUNTOS / HISTORIAL (relación polimórfica).
const ENTIDADES = ['PROYECTO', 'TAREA', 'SPRINT'];

// Estados que cuentan como "cerrados" (no vencen, no entran en pendientes).
const ESTADOS_PROYECTO_CERRADOS = ['Finalizado', 'Cancelado'];
const ESTADOS_TAREA_CERRADOS    = ['Finalizada', 'Cancelada'];
const ESTADOS_SPRINT_CERRADOS   = ['Cerrado', 'Cancelado'];

// Estados que cuentan como "completados" para el cálculo de avance.
const ESTADO_TAREA_COMPLETADA = 'Finalizada';
