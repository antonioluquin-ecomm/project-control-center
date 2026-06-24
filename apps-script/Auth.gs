// ============================================================
// PROJECT CONTROL CENTER — Auth.gs
// Sesiones, login/logout y validación de rol.
// Almacenamiento de password: SHA256(salt + password_hash),
// donde password_hash = SHA256(plainPassword) llega del frontend.
// (CLAUDE.md — patrón canónico de login; apps_script_standards §7)
// ============================================================

function hashPassword_(salt, passwordHash) {
  return computeSha256Hex_(salt + passwordHash);
}

// ── SETUP CHECK ───────────────────────────────────────────────
// El frontend lo usa para decidir si exigir login.
function checkSetup_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.USUARIOS);
  if (!sheet) return { ok: true, usuarios_configured: false };
  const data = sheet.getDataRange().getValues();
  return { ok: true, usuarios_configured: data.length > 1 && data[1][0] !== '' };
}

// ── ROLES ─────────────────────────────────────────────────────
function getNombreRol_(idRol) {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.ROLES);
  if (!sheet) return idRol === ROL_ADMIN ? 'Admin' : 'Agente';
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === Number(idRol)) return String(data[i][1]);
  }
  return 'Agente';
}

// Lanza error si el usuario no es admin (router lo llama antes de escrituras).
function requireAdmin_(user) {
  if (!user || Number(user.id_rol) !== ROL_ADMIN) {
    const err = new Error('Sin permisos para esta operación');
    err.code = 403;
    throw err;
  }
}

// ── VALIDACIÓN DE SESIÓN ──────────────────────────────────────
// Devuelve { ok, id_usuario, email, id_rol } o { ok:false, error }.
// Relee rol/estado del usuario (pueden haber cambiado desde el login).
function validateSessionToken_(sessionToken) {
  if (!sessionToken) return { ok: false, error: 'Token requerido' };
  const ss    = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEETS.SESIONES);
  if (!sheet) return { ok: false, error: 'Sesión no válida' };

  const data = sheet.getDataRange().getValues();
  const h      = data[0];
  const tokIdx = h.indexOf('session_token');
  const uidIdx = h.indexOf('id_usuario');
  const emlIdx = h.indexOf('email');
  const rolIdx = h.indexOf('id_rol');
  const expIdx = h.indexOf('expira_en');
  const actIdx = h.indexOf('activa');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][tokIdx]) === sessionToken) {
      if (data[i][actIdx] !== 'SI') return { ok: false, error: 'Sesión inactiva' };
      if (new Date(data[i][expIdx]) < new Date()) return { ok: false, error: 'Sesión expirada' };

      const idUsuario = data[i][uidIdx];
      let rolActual   = Number(data[i][rolIdx]);

      const usSheet = ss.getSheetByName(SHEETS.USUARIOS);
      if (usSheet) {
        const usData = usSheet.getDataRange().getValues();
        const uH     = usData[0];
        const uIdIdx = uH.indexOf('id');
        const uRolIdx = uH.indexOf('id_rol');
        const uActIdx = uH.indexOf('activo');
        for (let j = 1; j < usData.length; j++) {
          if (String(usData[j][uIdIdx]) === String(idUsuario)) {
            if (usData[j][uActIdx] !== 'SI') return { ok: false, error: 'Usuario inactivo' };
            rolActual = Number(usData[j][uRolIdx]);
            break;
          }
        }
      }

      return { ok: true, id_usuario: idUsuario, email: String(data[i][emlIdx]), id_rol: rolActual };
    }
  }
  return { ok: false, error: 'Sesión no encontrada' };
}

// ── LOGIN ─────────────────────────────────────────────────────
function login_(body) {
  const email        = String(body.email         || '').toLowerCase().trim();
  const passwordHash = String(body.password_hash || '');
  if (!email || !passwordHash) return { ok: false, error: 'Email y contraseña requeridos', code: 400 };

  // Rate limit por email (5 intentos / 15 min).
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'lf_' + email.replace(/[^a-z0-9]/g, '_');
  const failCount = parseInt(cache.get(cacheKey) || '0', 10);
  if (failCount >= 5) return { ok: false, error: 'Demasiados intentos fallidos. Esperá 15 minutos.', code: 429 };

  const ss    = getSpreadsheet_();
  const sheet = ss.getSheetByName(SHEETS.USUARIOS);
  if (!sheet) return { ok: false, error: 'Sistema de usuarios no configurado. Ejecutá setupAll() en Apps Script.', code: 500 };

  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const idIdx   = h.indexOf('id');
  const nomIdx  = h.indexOf('nombre');
  const emlIdx  = h.indexOf('email');
  const hashIdx = h.indexOf('password_hash');
  const saltIdx = h.indexOf('salt');
  const rolIdx  = h.indexOf('id_rol');
  const actIdx  = h.indexOf('activo');
  const ultIdx  = h.indexOf('ultimo_acceso');

  let userRow = null, userRowNum = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emlIdx]).toLowerCase() === email) { userRow = data[i]; userRowNum = i + 1; break; }
  }
  if (!userRow) { cache.put(cacheKey, String(failCount + 1), 900); return { ok: false, error: 'Email o contraseña incorrectos', code: 401 }; }
  if (userRow[actIdx] !== 'SI') return { ok: false, error: 'Usuario inactivo. Contactá al administrador.', code: 403 };

  if (hashPassword_(String(userRow[saltIdx]), passwordHash) !== String(userRow[hashIdx])) {
    cache.put(cacheKey, String(failCount + 1), 900);
    return { ok: false, error: 'Email o contraseña incorrectos', code: 401 };
  }

  const userId = userRow[idIdx];
  const idRol  = Number(userRow[rolIdx]);
  const nombre = String(userRow[nomIdx]);

  sheet.getRange(userRowNum, ultIdx + 1).setValue(new Date().toISOString());

  const sessionToken = Utilities.getUuid();
  const expiraEn = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // TTL 8h
  const sesSheet = ss.getSheetByName(SHEETS.SESIONES);
  if (sesSheet) sesSheet.appendRow([sessionToken, userId, email, idRol, expiraEn, new Date().toISOString(), 'SI']);

  cache.remove(cacheKey);
  writeLog_('login', 'USUARIOS', userId, 'OK', '', email);
  return {
    ok: true,
    session_token: sessionToken,
    usuario: { id: userId, nombre: nombre, email: email, id_rol: idRol, nombre_rol: getNombreRol_(idRol) },
    permisos: getPermisosForRol_(idRol),
    expira_en: expiraEn,
  };
}

// ── LOGOUT ────────────────────────────────────────────────────
function logout_(body) {
  const token = String(body.session_token || '');
  if (!token) return { ok: true };
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.SESIONES);
  if (!sheet) return { ok: true };
  const data = sheet.getDataRange().getValues();
  const idxTok = data[0].indexOf('session_token');
  const idxAct = data[0].indexOf('activa');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxTok]) === token) { sheet.getRange(i + 1, idxAct + 1).setValue('NO'); break; }
  }
  return { ok: true };
}

// ── VALIDATE SESSION (para el frontend) ───────────────────────
function validateSession_(body) {
  const res = validateSessionToken_(body.session_token);
  if (!res.ok) return { ok: false, error: res.error, code: 401 };
  return {
    ok: true,
    usuario: { id: res.id_usuario, email: res.email, id_rol: res.id_rol, nombre_rol: getNombreRol_(res.id_rol) },
    permisos: getPermisosForRol_(res.id_rol),
  };
}
