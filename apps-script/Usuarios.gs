// ============================================================
// PROJECT CONTROL CENTER — Usuarios.gs
// Gestión de usuarios internos (CRUD admin) y cambio de contraseña.
// Roles: 1 = Admin (escribe), 2 = Agente (solo lectura).
// ============================================================

// ── LISTAR (admin) ────────────────────────────────────────────
function getUsuarios_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.USUARIOS);
  if (!sheet) return { ok: true, data: [] };
  const usuarios = getAllRows_(SHEETS.USUARIOS, USUARIOS_COLS).map(function(u) {
    delete u.password_hash;
    delete u.salt;
    return u;
  });
  return { ok: true, data: usuarios };
}

// ── LISTAR BÁSICO (cualquier usuario autenticado) ─────────────
// Solo id, nombre, email de usuarios activos. Para poblar el selector
// de responsable sin exponer rol/hash/salt.
function getUsuariosBasico_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.USUARIOS);
  if (!sheet) return { ok: true, data: [] };
  const usuarios = getAllRows_(SHEETS.USUARIOS, USUARIOS_COLS)
    .filter(function(u) { return String(u.activo) === 'SI'; })
    .map(function(u) { return { id: u.id, nombre: u.nombre, email: u.email }; });
  return { ok: true, data: usuarios };
}

// ============================================================
// ROLES (gestión admin) — modelo flexible
// ============================================================

// ── LISTAR roles (admin) ──────────────────────────────────────
function getRoles_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.ROLES);
  if (!sheet) return { ok: true, data: [] };
  const roles = getAllRows_(SHEETS.ROLES, ROLES_COLS);
  return { ok: true, data: roles };
}

// ── CREAR rol personalizado (admin) ───────────────────────────
// Siembra todos los módulos en Oculto (ver=NO, editar=NO) por defecto.
function createRol_(params, user) {
  const nombre = String(params.nombre || '').trim();
  const desc   = String(params.descripcion || '').trim();
  if (!nombre) return { ok: false, error: 'El nombre del rol es requerido', code: 400 };

  const sheet = getSheet_(SHEETS.ROLES);
  const data = sheet.getDataRange().getValues();
  const nIdx = data[0].indexOf('nombre');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][nIdx]).toLowerCase() === nombre.toLowerCase()) {
      return { ok: false, error: 'Ya existe un rol con ese nombre', code: 409 };
    }
  }

  const nextId = getNextId_(sheet);
  sheet.appendRow([nextId, nombre, desc || 'Rol personalizado.', 'SI', 'NO']);

  // Siembra de permisos: todos los módulos en Oculto.
  const permisos = getSheet_(SHEETS.PERMISOS_MODULOS);
  MODULOS.forEach(function(modulo) { permisos.appendRow([nextId, modulo, 'NO', 'NO']); });

  writeLog_('createRol', 'ROLES', nextId, 'OK', nombre, user && user.email);
  return { ok: true, data: { id: nextId } };
}

// ── ACTUALIZAR rol (admin) ────────────────────────────────────
// Renombrar y/o activar/desactivar. Bloquea los roles de sistema.
function updateRol_(params, user) {
  const id = Number(params.id);
  if (_esRolSistema_(id)) return { ok: false, error: 'El rol del sistema no se puede modificar', code: 403 };

  const sheet = getSheet_(SHEETS.ROLES);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Rol no encontrado', code: 404 };
  const h = sheet.getDataRange().getValues()[0];

  if (params.nombre !== undefined) {
    const nombre = String(params.nombre).trim();
    if (!nombre) return { ok: false, error: 'El nombre del rol es requerido', code: 400 };
    const data = sheet.getDataRange().getValues();
    const nIdx = h.indexOf('nombre'), idIdx = h.indexOf('id');
    for (let i = 1; i < data.length; i++) {
      if (Number(data[i][idIdx]) !== id && String(data[i][nIdx]).toLowerCase() === nombre.toLowerCase()) {
        return { ok: false, error: 'Ya existe un rol con ese nombre', code: 409 };
      }
    }
    sheet.getRange(rowNum, h.indexOf('nombre') + 1).setValue(nombre);
  }
  if (params.descripcion !== undefined) sheet.getRange(rowNum, h.indexOf('descripcion') + 1).setValue(String(params.descripcion).trim());
  if (params.activo !== undefined) sheet.getRange(rowNum, h.indexOf('activo') + 1).setValue(params.activo === 'SI' ? 'SI' : 'NO');

  writeLog_('updateRol', 'ROLES', id, 'OK', '', user && user.email);
  return { ok: true, data: { id: id } };
}

// ── CREAR (admin) ─────────────────────────────────────────────
function createUsuario_(params, user) {
  const nombre = String(params.nombre || '').trim();
  const email  = String(params.email  || '').toLowerCase().trim();
  const passwordHash = String(params.password_hash || '');
  const idRol  = Number(params.id_rol || ROL_AGENTE);

  if (!nombre || !email || !passwordHash) return { ok: false, error: 'Nombre, email y contraseña son requeridos', code: 400 };
  if (!_getRolRow_(idRol)) return { ok: false, error: 'Rol inválido', code: 400 };

  const sheet = getSheet_(SHEETS.USUARIOS);
  const existing = sheet.getDataRange().getValues();
  const eIdx = existing[0].indexOf('email');
  for (let i = 1; i < existing.length; i++) {
    if (String(existing[i][eIdx]).toLowerCase() === email) return { ok: false, error: 'El email ya está en uso', code: 409 };
  }

  const nextId = getNextId_(sheet);
  const salt   = Utilities.getUuid();
  sheet.appendRow([
    nextId, nombre, email, hashPassword_(salt, passwordHash), salt,
    idRol, 'SI', new Date().toISOString(), '', (user && user.email) || '',
  ]);
  writeLog_('createUsuario', 'USUARIOS', nextId, 'OK', email, user && user.email);
  return { ok: true, data: { id: nextId } };
}

// ── ACTUALIZAR (admin) ────────────────────────────────────────
function updateUsuario_(params, user) {
  const id = Number(params.id);
  const sheet = getSheet_(SHEETS.USUARIOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Usuario no encontrado', code: 404 };

  const allData = sheet.getDataRange().getValues();
  const h = allData[0];

  // ── Invariante: el sistema nunca queda sin ≥1 Administrador activo ──
  const colIdU = h.indexOf('id'), colRol = h.indexOf('id_rol'), colAct = h.indexOf('activo');
  const filaActual = allData[findRowNumber_(sheet, id) - 1];
  const eraAdmin = Number(filaActual[colRol]) === ROL_ADMIN && String(filaActual[colAct]) === 'SI';
  if (eraAdmin) {
    const quitaAdmin = params.id_rol !== undefined && Number(params.id_rol) !== ROL_ADMIN;
    const desactiva  = params.activo  !== undefined && params.activo !== 'SI';
    if (quitaAdmin || desactiva) {
      let otrosAdmins = 0;
      for (let k = 1; k < allData.length; k++) {
        if (Number(allData[k][colIdU]) !== id &&
            Number(allData[k][colRol]) === ROL_ADMIN &&
            String(allData[k][colAct]) === 'SI') otrosAdmins++;
      }
      if (otrosAdmins === 0) return { ok: false, error: 'No se puede: debe quedar al menos un Administrador activo', code: 409 };
    }
  }

  if (params.email !== undefined) {
    const newEmail = String(params.email).toLowerCase().trim();
    const colId = h.indexOf('id'), colEm = h.indexOf('email');
    for (let j = 1; j < allData.length; j++) {
      if (Number(allData[j][colId]) !== id && String(allData[j][colEm]).toLowerCase() === newEmail) {
        return { ok: false, error: 'El email ya está en uso', code: 409 };
      }
    }
    sheet.getRange(rowNum, colEm + 1).setValue(newEmail);
  }
  if (params.nombre !== undefined) sheet.getRange(rowNum, h.indexOf('nombre') + 1).setValue(String(params.nombre).trim());
  if (params.id_rol !== undefined) {
    const r = Number(params.id_rol);
    if (!_getRolRow_(r)) return { ok: false, error: 'Rol inválido', code: 400 };
    sheet.getRange(rowNum, h.indexOf('id_rol') + 1).setValue(r);
  }
  if (params.activo !== undefined) sheet.getRange(rowNum, h.indexOf('activo') + 1).setValue(params.activo === 'SI' ? 'SI' : 'NO');
  if (params.password_hash && String(params.password_hash).trim()) {
    const newSalt = Utilities.getUuid();
    sheet.getRange(rowNum, h.indexOf('password_hash') + 1).setValue(hashPassword_(newSalt, String(params.password_hash)));
    sheet.getRange(rowNum, h.indexOf('salt') + 1).setValue(newSalt);
  }
  writeLog_('updateUsuario', 'USUARIOS', id, 'OK', '', user && user.email);
  return { ok: true, data: { id: id } };
}

// ── CAMBIAR CONTRASEÑA (self-service) ─────────────────────────
function changePassword_(body, user) {
  const idUsuario = user && user.id_usuario;
  const actualHash = String(body.password_actual_hash || '');
  const nuevaHash  = String(body.password_nueva_hash  || '');
  if (!idUsuario) return { ok: false, error: 'Sesión no válida', code: 401 };
  if (!actualHash || !nuevaHash) return { ok: false, error: 'Todos los campos son requeridos', code: 400 };

  const sheet = getSheet_(SHEETS.USUARIOS);
  const rowNum = findRowNumber_(sheet, idUsuario);
  if (!rowNum) return { ok: false, error: 'Usuario no encontrado', code: 404 };

  const row = sheet.getDataRange().getValues()[rowNum - 1];
  const h = sheet.getDataRange().getValues()[0];
  const idxHash = h.indexOf('password_hash'), idxSalt = h.indexOf('salt');

  if (hashPassword_(String(row[idxSalt]), actualHash) !== String(row[idxHash])) {
    return { ok: false, error: 'La contraseña actual es incorrecta', code: 401 };
  }
  const newSalt = Utilities.getUuid();
  sheet.getRange(rowNum, idxHash + 1).setValue(hashPassword_(newSalt, nuevaHash));
  sheet.getRange(rowNum, idxSalt + 1).setValue(newSalt);
  return { ok: true };
}

// ── MIGRACIÓN MANUAL ──────────────────────────────────────────
// Resetea la contraseña de un usuario desde el editor de Apps Script.
// Uso: function _migrar(){ rehashUser('mail@empresa.com','nuevaClave'); }
function rehashUser(email, newPlainPassword) {
  if (!email || !newPlainPassword) { Logger.log('Faltan argumentos. Crear wrapper _migrar().'); return; }
  const passwordHash = computeSha256Hex_(newPlainPassword); // simula el SHA256 del frontend
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.USUARIOS);
  if (!sheet) { Logger.log('Hoja USUARIOS no encontrada'); return; }
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const eIdx = h.indexOf('email'), hIdx = h.indexOf('password_hash'), sIdx = h.indexOf('salt');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][eIdx]).toLowerCase() === email.toLowerCase().trim()) {
      const salt = Utilities.getUuid();
      sheet.getRange(i + 1, hIdx + 1).setValue(hashPassword_(salt, passwordHash));
      sheet.getRange(i + 1, sIdx + 1).setValue(salt);
      Logger.log('✓ Contraseña actualizada para ' + email);
      return;
    }
  }
  Logger.log('✗ Usuario no encontrado: ' + email);
}
