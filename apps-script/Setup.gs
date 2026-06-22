// ============================================================
// PROJECT CONTROL CENTER — Setup.gs
// Bootstrap del Sheet: crea hojas, headers y datos semilla.
// Ejecutar UNA vez desde el editor tras configurar SPREADSHEET_ID.
//   1) setupAll()
//   2) function _admin(){ seedAdmin('vos@empresa.com','TuClave123'); } → ejecutar _admin
// ============================================================

// Headers de cada hoja (orden = mapa de columnas en Config.gs).
const _HEADERS = {
  PROYECTOS: ['id','nombre','descripcion','estado','prioridad','responsable','sitio',
              'fecha_inicio','fecha_fin_estimada','observaciones',
              'fecha_creacion','fecha_modificacion','creado_por','modificado_por'],
  TAREAS: ['id','id_proyecto','titulo','descripcion','tipo','estado','prioridad','responsable',
           'fecha_inicio','fecha_limite','avance_pct','orden',
           'fecha_creacion','fecha_modificacion','creado_por','modificado_por'],
  COMENTARIOS: ['id','entidad','id_entidad','texto','usuario','fecha_creacion'],
  ADJUNTOS: ['id','entidad','id_entidad','nombre_archivo','file_id','url','thumbnail_url','mime','tamano','subido_por','fecha_creacion'],
  HISTORIAL: ['id','timestamp','entidad','id_entidad','campo','valor_anterior','valor_nuevo','usuario'],
  USUARIOS: ['id','nombre','email','password_hash','salt','id_rol','activo','fecha_creacion','ultimo_acceso','creado_por'],
  SESIONES: ['session_token','id_usuario','email','id_rol','expira_en','creada_en','activa'],
  ROLES: ['id','nombre'],
  LOGS: ['id','timestamp','accion','entidad','entidad_id','usuario','resultado','detalle'],
  ERRORS: ['id','timestamp','accion','usuario','mensaje','stack'],
  CONFIG: ['clave','valor','descripcion'],
};

const _CATALOGOS = {
  CAT_ESTADOS_PROYECTO: ESTADOS_PROYECTO,
  CAT_ESTADOS_TAREA:    ESTADOS_TAREA,
  CAT_TIPOS_TAREA:      TIPOS_TAREA,
  CAT_PRIORIDADES:      PRIORIDADES,
  CAT_SITIOS:           SITIOS,
  CAT_RESPONSABLES:     [], // se llena desde la UI / migración
};

function setupAll() {
  const ss = getSpreadsheet_();

  // 1) Hojas con header.
  Object.keys(_HEADERS).forEach(function(name) {
    const sheet = _ensureSheet_(ss, name);
    _ensureHeader_(sheet, _HEADERS[name]);
  });

  // 2) Catálogos (header = nombre de la hoja + valores).
  Object.keys(_CATALOGOS).forEach(function(name) {
    const sheet = _ensureSheet_(ss, name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([name]); // header identificador
      _CATALOGOS[name].forEach(function(v) { sheet.appendRow([v]); });
    }
  });

  // 3) ROLES.
  const roles = ss.getSheetByName(SHEETS.ROLES);
  if (roles.getLastRow() <= 1) {
    roles.appendRow([ROL_ADMIN, 'Admin']);
    roles.appendRow([ROL_AGENTE, 'Agente']);
  }

  // 4) CONFIG.
  const cfg = ss.getSheetByName(SHEETS.CONFIG);
  if (cfg.getLastRow() <= 1) {
    cfg.appendRow(['SHEET_VERSION', '1.0', 'Versión del schema del Sheet']);
    cfg.appendRow(['WEBHOOK_URL', '', 'URL del Web App — actualizar tras cada deploy']);
    cfg.appendRow(['LAST_SETUP', new Date().toISOString(), 'Último setupAll()']);
  }

  Logger.log('✓ setupAll completo. Ahora ejecutá seedAdmin(email, clave) vía wrapper.');
}

// Crea el primer usuario administrador.
// Uso: function _admin(){ seedAdmin('vos@empresa.com','TuClave123'); }
function seedAdmin(email, plainPassword) {
  if (!email || !plainPassword) { Logger.log('Faltan argumentos. Crear wrapper _admin().'); return; }
  const sheet = getSheet_(SHEETS.USUARIOS);
  const existing = sheet.getDataRange().getValues();
  const eIdx = existing[0].indexOf('email');
  for (let i = 1; i < existing.length; i++) {
    if (String(existing[i][eIdx]).toLowerCase() === email.toLowerCase().trim()) {
      Logger.log('El usuario ya existe: ' + email); return;
    }
  }
  const salt = Utilities.getUuid();
  const passwordHash = computeSha256Hex_(plainPassword); // simula el SHA256 del frontend
  sheet.appendRow([
    getNextId_(sheet), 'Administrador', email.toLowerCase().trim(),
    hashPassword_(salt, passwordHash), salt, ROL_ADMIN, 'SI',
    new Date().toISOString(), '', 'setup',
  ]);
  Logger.log('✓ Admin creado: ' + email);
}

// Actualiza los catálogos CAT_ existentes con los valores actuales de Config.gs.
// Correr cuando se agreguen nuevos estados/tipos (ej: después de S5).
function actualizarCatalogos() {
  const ss = getSpreadsheet_();
  Object.keys(_CATALOGOS).forEach(function(name) {
    const sheet  = ss.getSheetByName(name);
    if (!sheet) return;
    // Limpiar valores existentes (mantener fila 1 = header).
    const last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, 1).clearContent();
    _CATALOGOS[name].forEach(function(v) { sheet.appendRow([v]); });
    Logger.log('✓ ' + name + ' actualizado.');
  });
}

// ── internos ──────────────────────────────────────────────────
function _ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _ensureHeader_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}
