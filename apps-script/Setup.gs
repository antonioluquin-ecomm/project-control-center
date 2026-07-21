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
           'requerimiento_texto','requerimiento_detalles','requerimiento_objetivo',
           'url_documentacion'],
  SPRINTS: ['id','nombre','objetivo','estado','fecha_inicio','fecha_fin',
            'fecha_creacion','fecha_modificacion','creado_por','modificado_por'],
  COMENTARIOS: ['id','entidad','id_entidad','texto','usuario','fecha_creacion','fecha_edicion'],
  ADJUNTOS: ['id','entidad','id_entidad','nombre_archivo','file_id','url','thumbnail_url','mime','tamano','subido_por','fecha_creacion'],
  CHECKLIST: ['id','entidad','id_entidad','texto','hecho','orden','fecha_creacion','creado_por'],
  HISTORIAL: ['id','timestamp','entidad','id_entidad','campo','valor_anterior','valor_nuevo','usuario'],
  USUARIOS: ['id','nombre','email','password_hash','salt','id_rol','activo','fecha_creacion','ultimo_acceso','creado_por'],
  SESIONES: ['session_token','id_usuario','email','id_rol','expira_en','creada_en','activa'],
  ROLES: ['id','nombre','descripcion','activo','es_sistema'],
  PERMISOS_MODULOS: ['id_rol','modulo','puede_ver','puede_editar'],
  NOTIFICACIONES: ['id','timestamp','destinatario','tipo','entidad','id_entidad','mensaje','origen','leida'],
  LOGS: ['id','timestamp','accion','entidad','entidad_id','usuario','resultado','detalle'],
  ERRORS: ['id','timestamp','accion','usuario','mensaje','stack'],
  CONFIG: ['clave','valor','descripcion'],
};

// Catálogos: semilla por defecto. Se guardan como filas de CONFIG
// (clave = nombre del catalogo, valor = CSV) — ver getCatValues_/setCatValues_
// en Helpers.gs. Antes cada uno tenia su propia hoja CAT_*; ver
// migrarCatalogosAConfig() para instalaciones viejas que todavia las tengan.
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
  CAT_RESPONSABLES:     [], // se llena desde la UI
};

function setupAll() {
  const ss = getSpreadsheet_();

  // 1) Hojas con header.
  Object.keys(_HEADERS).forEach(function(name) {
    const sheet = _ensureSheet_(ss, name);
    _ensureHeader_(sheet, _HEADERS[name]);
  });

  // 1b) COMENTARIOS: instalaciones anteriores no tenian fecha_edicion.
  migrateComentariosSchema(ss.getSheetByName(SHEETS.COMENTARIOS));

  // 2) Catálogos: una fila por catalogo en CONFIG (solo si todavia no existe).
  const config = _ensureSheet_(ss, SHEETS.CONFIG);
  _ensureHeader_(config, _HEADERS.CONFIG);
  Object.keys(_CATALOGOS).forEach(function(clave) {
    if (_configFindRow_(config, clave)) return;
    const valores = _CATALOGOS[clave];
    if (valores.length) config.appendRow([clave, valores.join(','), '']);
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

// Fuerza cada catalogo (fila de CONFIG) a los valores por defecto de Config.gs,
// descartando lo que haya cargado un admin desde la UI. Correr a mano solo si
// hace falta resetear un catalogo puntual.
function actualizarCatalogos() {
  Object.keys(_CATALOGOS).forEach(function(clave) {
    if (!_CATALOGOS[clave].length) return; // CAT_RESPONSABLES: sin default, no lo pisa
    setCatValues_(clave, _CATALOGOS[clave]);
    Logger.log('✓ ' + clave + ' actualizado.');
  });
}

// Migracion: para instalaciones que todavia tengan una hoja CAT_* dedicada
// por catalogo (esquema anterior a consolidarlos en CONFIG). Copia los
// valores de cada hoja CAT_* existente a su fila en CONFIG. NO borra las
// hojas viejas (por si hace falta revisarlas) — se pueden eliminar a mano
// despues de confirmar que la migracion salio bien. Correr UNA vez.
function migrarCatalogosAConfig() {
  const ss = getSpreadsheet_();
  const config = _ensureSheet_(ss, SHEETS.CONFIG);
  _ensureHeader_(config, _HEADERS.CONFIG);
  let migrados = 0;
  Object.keys(_CATALOGOS).forEach(function(clave) {
    const hojaVieja = ss.getSheetByName(clave);
    if (!hojaVieja) return;
    const valores = hojaVieja.getRange('A:A').getValues().flat()
      .filter(function(v) { return v !== '' && v !== clave; });
    if (!valores.length) return;
    setCatValues_(clave, valores);
    migrados++;
  });
  Logger.log('✓ Catalogos migrados a CONFIG: ' + migrados + '. Las hojas CAT_* viejas no se borraron; se pueden eliminar a mano si ya no hacen falta.');
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

  // 3) Catálogo de estados de sprint (fila en CONFIG).
  const config = _ensureSheet_(ss, SHEETS.CONFIG);
  _ensureHeader_(config, _HEADERS.CONFIG);
  if (!_configFindRow_(config, CATALOGOS.CAT_ESTADOS_SPRINT)) {
    config.appendRow([CATALOGOS.CAT_ESTADOS_SPRINT, ESTADOS_SPRINT.join(','), '']);
  }
  Logger.log('✓ Sprints: hoja SPRINTS, header id_sprint en TAREAS y catalogo CAT_ESTADOS_SPRINT listos.');
}

// Notificaciones: crea la hoja NOTIFICACIONES (si falta) con su header.
// Idempotente. Correr UNA vez en el editor tras desplegar el código de
// notificaciones (o simplemente correr setupAll() de nuevo, que ya la incluye).
function crearHojaNotificaciones() {
  const ss = getSpreadsheet_();
  const sheet = _ensureSheet_(ss, SHEETS.NOTIFICACIONES);
  _ensureHeader_(sheet, _HEADERS.NOTIFICACIONES);
  Logger.log('✓ Notificaciones: hoja NOTIFICACIONES lista.');
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

// Agrega la columna de edición a instalaciones existentes sin alterar comentarios.
function migrateComentariosSchema(sheet) {
  if (!sheet) return;
  const col = COMENTARIOS_COLS.fecha_edicion;
  const actual = String(sheet.getRange(1, col).getValue() || '').trim();
  if (!actual) sheet.getRange(1, col).setValue('fecha_edicion');
  else if (actual !== 'fecha_edicion') throw new Error('COMENTARIOS: la columna ' + col + ' está ocupada por "' + actual + '"');
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
