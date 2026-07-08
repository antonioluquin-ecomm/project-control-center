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
           'fecha_creacion','fecha_modificacion','creado_por','modificado_por',
           'area','tienda','url_jira','url_gitlab','url_figma_prototipo','url_figma_editable',
           'id_sprint','url_informe_gestion',
           'seccion','dispositivos','informe_version',
           'informe_fecha_implementacion','informe_descripcion_general',
           'informe_detalles_tecnicos','informe_resultado',
           'requerimiento_texto','requerimiento_detalles','requerimiento_objetivo'],
  SPRINTS: ['id','nombre','objetivo','estado','fecha_inicio','fecha_fin',
            'fecha_creacion','fecha_modificacion','creado_por','modificado_por'],
  COMENTARIOS: ['id','entidad','id_entidad','texto','usuario','fecha_creacion'],
  ADJUNTOS: ['id','entidad','id_entidad','nombre_archivo','file_id','url','thumbnail_url','mime','tamano','subido_por','fecha_creacion'],
  CHECKLIST: ['id','entidad','id_entidad','texto','hecho','orden','fecha_creacion','creado_por'],
  HISTORIAL: ['id','timestamp','entidad','id_entidad','campo','valor_anterior','valor_nuevo','usuario'],
  USUARIOS: ['id','nombre','email','password_hash','salt','id_rol','activo','fecha_creacion','ultimo_acceso','creado_por'],
  SESIONES: ['session_token','id_usuario','email','id_rol','expira_en','creada_en','activa'],
  ROLES: ['id','nombre','descripcion','activo','es_sistema'],
  PERMISOS_MODULOS: ['id_rol','modulo','puede_ver','puede_editar'],
  LOGS: ['id','timestamp','accion','entidad','entidad_id','usuario','resultado','detalle'],
  ERRORS: ['id','timestamp','accion','usuario','mensaje','stack'],
  CONFIG: ['clave','valor','descripcion'],
};

const _CATALOGOS = {
  CAT_ESTADOS_PROYECTO: ESTADOS_PROYECTO,
  CAT_ESTADOS_TAREA:    ESTADOS_TAREA,
  CAT_ESTADOS_SPRINT:   ESTADOS_SPRINT,
  CAT_TIPOS_TAREA:      TIPOS_TAREA,
  CAT_PRIORIDADES:      PRIORIDADES,
  CAT_SITIOS:           SITIOS,
  CAT_AREAS:            AREAS,
  CAT_TIENDAS:          TIENDAS,
  CAT_SECCIONES:        SECCIONES,
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

  // 3) ROLES — migrar schema viejo (id,nombre) → (id,nombre,descripcion,activo,es_sistema)
  // antes de sembrar, para hojas preexistentes. Idempotente.
  const roles = ss.getSheetByName(SHEETS.ROLES);
  migrateRolesSchema(roles);
  if (roles.getLastRow() <= 1) {
    roles.appendRow([ROL_ADMIN,  'Administrador', 'Acceso total. Rol del sistema.', 'SI', 'SI']);
    roles.appendRow([ROL_AGENTE, 'Agente',        'Ve todos los módulos, sin edición.', 'SI', 'NO']);
  }

  // 3b) PERMISOS_MODULOS — seed del rol semilla no-admin (por defecto: ve todo, no edita).
  // El Administrador no necesita filas: su rol da acceso total.
  const permisos = ss.getSheetByName(SHEETS.PERMISOS_MODULOS);
  if (permisos.getLastRow() <= 1) {
    MODULOS.forEach(function(modulo) {
      permisos.appendRow([ROL_AGENTE, modulo, 'SI', 'NO']);
    });
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

// S6: agrega los headers nuevos de TAREAS a una hoja YA poblada, sin tocar datos.
// Idempotente: solo escribe los headers que falten (a partir de la columna actual).
// Correr UNA vez en el editor tras desplegar el código de S6.
function agregarColumnasTareas() {
  const sheet = getSheet_(SHEETS.TAREAS);
  const headersDeseados = _HEADERS.TAREAS;
  const ultimaCol = sheet.getLastColumn();
  const actuales = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0];

  let agregadas = 0;
  for (let i = 0; i < headersDeseados.length; i++) {
    if (String(actuales[i] || '').trim() !== headersDeseados[i]) {
      sheet.getRange(1, i + 1).setValue(headersDeseados[i]);
      agregadas++;
    }
  }
  sheet.setFrozenRows(1);
  Logger.log('✓ TAREAS: headers sincronizados (' + agregadas + ' celdas escritas). Total columnas: ' + headersDeseados.length);
}

// Sprints: crea la hoja SPRINTS (si falta) y agrega el header id_sprint a la
// hoja TAREAS ya poblada, sin tocar datos. Idempotente. Correr UNA vez en el
// editor tras desplegar el código de sprints.
function agregarColumnaSprintTareas() {
  const ss = getSpreadsheet_();

  // 1) Hoja SPRINTS con header.
  const sprints = _ensureSheet_(ss, SHEETS.SPRINTS);
  _ensureHeader_(sprints, _HEADERS.SPRINTS);

  // 2) Header id_sprint en TAREAS (reusa el sync idempotente de headers).
  agregarColumnasTareas();

  // 3) Catálogo de estados de sprint.
  const cat = _ensureSheet_(ss, SHEETS.CAT_ESTADOS_SPRINT);
  if (cat.getLastRow() === 0) {
    cat.appendRow([SHEETS.CAT_ESTADOS_SPRINT]);
    ESTADOS_SPRINT.forEach(function(v) { cat.appendRow([v]); });
  }
  Logger.log('✓ Sprints: hoja SPRINTS, header id_sprint en TAREAS y CAT_ESTADOS_SPRINT listos.');
}

// Migra la hoja ROLES del schema viejo (id, nombre) al actual
// (id, nombre, descripcion, activo, es_sistema). Idempotente: se puede correr
// N veces. Corre dentro de setupAll() antes de sembrar.
function migrateRolesSchema(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return;  // hoja vacía → la siembra se encarga
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 5)).getValues()[0];

  // 1) Headers faltantes (append, no reordena).
  const want = ['id', 'nombre', 'descripcion', 'activo', 'es_sistema'];
  let changed = false;
  want.forEach(function(hName, i) {
    if (String(headers[i] || '').trim() !== hName) { sheet.getRange(1, i + 1).setValue(hName); changed = true; }
  });
  if (changed) Logger.log('  [MIGRACION] ROLES: headers normalizados');

  const last = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2, 1, last - 1, 5).getValues();

  // 2) Renombres conocidos (solo nombres viejos; no pisa personalizados).
  const RENAMES = { 'Admin': 'Administrador' };

  for (let i = 0; i < data.length; i++) {
    const rowNum = i + 2;
    const id     = Number(data[i][0]);
    const nombre = String(data[i][1] || '');
    let desc     = String(data[i][2] || '');
    let activo   = String(data[i][3] || '');
    let esSist   = String(data[i][4] || '');

    // es_sistema: SI solo para id=1, NO para el resto.
    const esSistDeseado = (id === ROL_ADMIN) ? 'SI' : 'NO';
    if (esSist !== esSistDeseado) { sheet.getRange(rowNum, ROLES_COLS.es_sistema).setValue(esSistDeseado); }

    // activo: SI si está vacío.
    if (activo !== 'SI' && activo !== 'NO') { sheet.getRange(rowNum, ROLES_COLS.activo).setValue('SI'); }

    // descripcion: default si está vacía.
    if (!desc) {
      const d = (id === ROL_ADMIN) ? 'Acceso total. Rol del sistema.' : 'Rol personalizado.';
      sheet.getRange(rowNum, ROLES_COLS.descripcion).setValue(d);
    }

    // nombre: renombrar solo si es un nombre viejo conocido.
    if (RENAMES[nombre]) {
      sheet.getRange(rowNum, ROLES_COLS.nombre).setValue(RENAMES[nombre]);
      Logger.log('  [MIGRACION] ROLES: "' + nombre + '" → "' + RENAMES[nombre] + '"');
    }
  }
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
