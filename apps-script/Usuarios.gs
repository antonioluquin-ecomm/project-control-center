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

// ── CREAR (admin) ─────────────────────────────────────────────
function createUsuario_(body, user) {
  const data   = body.data || {};
  const nombre = String(data.nombre || '').trim();
  const email  = String(data.email  || '').toLowerCase().trim();
  const passwordHash = String(data.password_hash || '');
  const idRol  = Number(data.id_rol || ROL_AGENTE);

  if (!nombre || !email || !passwordHash) return { ok: false, error: 'Nombre, email y contraseña son requeridos', code: 400 };
  if (idRol !== ROL_ADMIN && idRol !== ROL_AGENTE) return { ok: false, error: 'Rol inválido', code: 400 };

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
  return { ok: true, id: nextId };
}

// ── ACTUALIZAR (admin) ────────────────────────────────────────
function updateUsuario_(body, user) {
  const id   = Number(body.id);
  const data = body.data || {};
  const sheet = getSheet_(SHEETS.USUARIOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Usuario no encontrado', code: 404 };

  const allData = sheet.getDataRange().getValues();
  const h = allData[0];

  if (data.email !== undefined) {
    const newEmail = String(data.email).toLowerCase().trim();
    const colId = h.indexOf('id'), colEm = h.indexOf('email');
    for (let j = 1; j < allData.length; j++) {
      if (Number(allData[j][colId]) !== id && String(allData[j][colEm]).toLowerCase() === newEmail) {
        return { ok: false, error: 'El email ya está en uso', code: 409 };
      }
    }
    sheet.getRange(rowNum, colEm + 1).setValue(newEmail);
  }
  if (data.nombre !== undefined) sheet.getRange(rowNum, h.indexOf('nombre') + 1).setValue(String(data.nombre).trim());
  if (data.id_rol !== undefined) {
    const r = Number(data.id_rol);
    if (r !== ROL_ADMIN && r !== ROL_AGENTE) return { ok: false, error: 'Rol inválido', code: 400 };
    sheet.getRange(rowNum, h.indexOf('id_rol') + 1).setValue(r);
  }
  if (data.activo !== undefined) sheet.getRange(rowNum, h.indexOf('activo') + 1).setValue(data.activo === 'SI' ? 'SI' : 'NO');
  if (data.password_hash && String(data.password_hash).trim()) {
    const newSalt = Utilities.getUuid();
    sheet.getRange(rowNum, h.indexOf('password_hash') + 1).setValue(hashPassword_(newSalt, String(data.password_hash)));
    sheet.getRange(rowNum, h.indexOf('salt') + 1).setValue(newSalt);
  }
  writeLog_('updateUsuario', 'USUARIOS', id, 'OK', '', user && user.email);
  return { ok: true };
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
