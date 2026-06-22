// ============================================================
// PROJECT CONTROL CENTER — Config.gs
// Solo constantes: nombres de hojas, mapas de columnas y dominios.
// Sin funciones (apps_script_standards §2.4).
// ============================================================

const SHEETS = {
  PROYECTOS:   'PROYECTOS',
  TAREAS:      'TAREAS',
  COMENTARIOS: 'COMENTARIOS',
  ADJUNTOS:    'ADJUNTOS',
  HISTORIAL:   'HISTORIAL',
  USUARIOS:    'USUARIOS',
  SESIONES:    'SESIONES',
  ROLES:       'ROLES',
  LOGS:        'LOGS',
  ERRORS:      'ERRORS',
  CONFIG:      'CONFIG',
  CAT_ESTADOS_PROYECTO: 'CAT_ESTADOS_PROYECTO',
  CAT_ESTADOS_TAREA:    'CAT_ESTADOS_TAREA',
  CAT_TIPOS_TAREA:      'CAT_TIPOS_TAREA',
  CAT_PRIORIDADES:      'CAT_PRIORIDADES',
  CAT_RESPONSABLES:     'CAT_RESPONSABLES',
  CAT_SITIOS:           'CAT_SITIOS',
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
};

const COMENTARIOS_COLS = {
  id:             1,
  entidad:        2,   // PROYECTO | TAREA
  id_entidad:     3,
  texto:          4,
  usuario:        5,
  fecha_creacion: 6,
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
// Modelo simple (canónico CLAUDE.md): Admin escribe, Agente solo lectura.
const ROL_ADMIN  = 1;
const ROL_AGENTE = 2;

// ── DOMINIOS CONTROLADOS ──────────────────────────────────────
// Replican las hojas CAT_ (google_sheets_standards §7.2).

const ESTADOS_PROYECTO = ['Por Hacer', 'En Análisis', 'En Curso', 'Bloqueado', 'Finalizado', 'Cancelado'];
const ESTADOS_TAREA    = ['Por Hacer', 'En Análisis', 'En Curso', 'Bloqueada', 'Finalizada', 'Cancelada'];
const TIPOS_TAREA      = ['Historia', 'Tarea', 'Error', 'Subtarea'];
const PRIORIDADES      = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const SITIOS           = ['Sporting', 'Woker', 'PIM', 'B2B', 'Todos'];

// Entidades válidas para COMENTARIOS / ADJUNTOS / HISTORIAL (relación polimórfica).
const ENTIDADES = ['PROYECTO', 'TAREA'];

// Estados que cuentan como "cerrados" (no vencen, no entran en pendientes).
const ESTADOS_PROYECTO_CERRADOS = ['Finalizado', 'Cancelado'];
const ESTADOS_TAREA_CERRADOS    = ['Finalizada', 'Cancelada'];

// Estados que cuentan como "completados" para el cálculo de avance.
const ESTADO_TAREA_COMPLETADA = 'Finalizada';
