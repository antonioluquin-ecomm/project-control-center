// ============================================================
// PROJECT CONTROL CENTER — Permisos.gs
// RBAC por módulo: hoja PERMISOS_MODULOS (id_rol, modulo, puede_ver, puede_editar).
// El Admin (ROL_ADMIN) tiene acceso total por rol — no necesita filas.
// Solo se configuran los permisos del Agente. (CLAUDE.md — patrón canónico)
// ============================================================

// Devuelve { modulo: { ver, editar } } para un rol. Vacío si no hay hoja.
function getPermisosForRol_(idRol) {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.PERMISOS_MODULOS);
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const idxRol = h.indexOf('id_rol');
  const idxMod = h.indexOf('modulo');
  const idxVer = h.indexOf('puede_ver');
  const idxEdt = h.indexOf('puede_editar');
  const permisos = {};
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][idxRol]) === Number(idRol)) {
      permisos[String(data[i][idxMod])] = {
        ver:    data[i][idxVer] === 'SI',
        editar: data[i][idxEdt] === 'SI',
      };
    }
  }
  return permisos;
}

// ── LISTAR (para la UI de administración) ─────────────────────
function getPermisos_() {
  const sheet = getSpreadsheet_().getSheetByName(SHEETS.PERMISOS_MODULOS);
  if (!sheet) return { ok: true, data: [] };
  const permisos = getAllRows_(SHEETS.PERMISOS_MODULOS, PERMISOS_MODULOS_COLS);
  return { ok: true, data: permisos };
}

// ── ACTUALIZAR (admin) ────────────────────────────────────────
// Persiste puede_ver Y puede_editar de un módulo para un rol personalizado.
// Bloquea los roles de sistema (Administrador). Coherencia: ver=NO ⇒ editar=NO.
function updatePermisos_(params, user) {
  const idRol  = Number(params.id_rol);
  const modulo = String(params.modulo || '');
  let puedeVer = (params.puede_ver === 'SI' || params.puede_ver === true) ? 'SI' : 'NO';
  let puedeEdt = (params.puede_editar === 'SI' || params.puede_editar === true) ? 'SI' : 'NO';
  if (puedeVer === 'NO') puedeEdt = 'NO';  // no se puede editar lo que no se ve

  if (_esRolSistema_(idRol)) return { ok: false, error: 'El Administrador tiene acceso total; no se configura', code: 403 };
  if (MODULOS.indexOf(modulo) === -1) return { ok: false, error: 'Módulo inválido: ' + modulo, code: 400 };

  const sheet = getSheet_(SHEETS.PERMISOS_MODULOS);
  const data = sheet.getDataRange().getValues();
  const h = data[0];
  const idxRol = h.indexOf('id_rol');
  const idxMod = h.indexOf('modulo');
  const idxVer = h.indexOf('puede_ver');
  const idxEdt = h.indexOf('puede_editar');

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][idxRol]) === idRol && String(data[i][idxMod]) === modulo) {
      sheet.getRange(i + 1, idxVer + 1).setValue(puedeVer);
      sheet.getRange(i + 1, idxEdt + 1).setValue(puedeEdt);
      writeLog_('updatePermisos', 'PERMISOS_MODULOS', modulo, 'OK', puedeVer + '/' + puedeEdt, user && user.email);
      return { ok: true };
    }
  }
  // No existía la fila → crearla (rol/módulo nuevo).
  sheet.appendRow([idRol, modulo, puedeVer, puedeEdt]);
  writeLog_('updatePermisos', 'PERMISOS_MODULOS', modulo, 'OK', puedeVer + '/' + puedeEdt, user && user.email);
  return { ok: true };
}
