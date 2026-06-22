// ============================================================
// PROJECT CONTROL CENTER — Logger.gs
// Logs de operaciones (LOGS) y errores (ERRORS).
// (apps_script_standards §8, google_sheets_standards §11)
// ============================================================

// Toda operación de escritura genera una fila en LOGS.
function writeLog_(accion, entidad, entidadId, resultado, detalle, usuario) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEETS.LOGS);
    if (!sheet) return;
    sheet.appendRow([
      getNextId_(sheet),
      new Date(),
      accion,
      entidad || '',
      entidadId || '',
      usuario || '',
      resultado || 'OK',
      detalle || '',
    ]);
  } catch (e) {
    // Nunca dejar que el logging rompa la operación principal.
  }
}

// Errores inesperados con stack para diagnóstico.
function writeError_(accion, mensaje, stack, usuario) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEETS.ERRORS);
    if (!sheet) return;
    sheet.appendRow([
      getNextId_(sheet),
      new Date(),
      accion,
      usuario || '',
      mensaje || '',
      stack || '',
    ]);
  } catch (e) {
    // idem writeLog_
  }
}

// Registro de cambio campo a campo (HISTORIAL / AUDIT_LOG).
function writeHistorial_(entidad, idEntidad, campo, valorAnterior, valorNuevo, usuario) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEETS.HISTORIAL);
    if (!sheet) return;
    sheet.appendRow([
      getNextId_(sheet),
      new Date(),
      entidad,
      idEntidad,
      campo,
      valorAnterior === null || valorAnterior === undefined ? '' : valorAnterior,
      valorNuevo === null || valorNuevo === undefined ? '' : valorNuevo,
      usuario || '',
    ]);
  } catch (e) {
    // idem
  }
}
