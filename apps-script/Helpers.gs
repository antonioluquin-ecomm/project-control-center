// ============================================================
// PROJECT CONTROL CENTER — Helpers.gs
// Utilidades genéricas de Sheets. No conocen entidades de negocio.
// (apps_script_standards §9)
// ============================================================

// ── Spreadsheet ───────────────────────────────────────────────
// openById desde Script Properties: funciona aunque el GAS no esté
// atado al Sheet (apps_script_standards §9.1).
function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID no configurado en Script Properties');
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Hoja no encontrada: ' + name);
  return sheet;
}

// ── Serialización ─────────────────────────────────────────────
function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function okResponse_(data) {
  return jsonResponse_(data !== undefined ? { ok: true, data: data } : { ok: true });
}

function errorResponse_(mensaje, code) {
  const out = { ok: false, error: mensaje };
  if (code) out.code = code;
  return jsonResponse_(out);
}

// ── Fila ↔ objeto ─────────────────────────────────────────────
// Usa el mapa de columnas. Normaliza fechas a ISO y "" → null.
function rowToObj_(row, colMap) {
  const obj = {};
  Object.keys(colMap).forEach(function(key) {
    const val = row[colMap[key] - 1]; // colMap es 1-indexed
    obj[key] = (val instanceof Date) ? val.toISOString()
             : (val === '' ? null : val);
  });
  return obj;
}

// Carga todas las filas de una hoja como array de objetos.
function getAllRows_(sheetName, colMap) {
  const data = getSheet_(sheetName).getDataRange().getValues();
  data.shift(); // header
  return data
    .filter(function(r) { return r[0] !== '' && r[0] !== null; })
    .map(function(r) { return rowToObj_(r, colMap); });
}

// ── Búsqueda e IDs ────────────────────────────────────────────
function findRowNumber_(sheet, id) {
  const ids = sheet.getRange('A:A').getValues().flat();
  const idx = ids.indexOf(parseInt(id, 10));
  return idx > 0 ? idx + 1 : null; // +1: rangos 1-indexed; idx 0 es header
}

function getNextId_(sheet) {
  const ids = sheet.getRange('A:A').getValues().flat()
    .map(function(v) { return parseInt(v, 10); })
    .filter(function(v) { return !isNaN(v) && v > 0; });
  return ids.length > 0 ? Math.max.apply(null, ids) + 1 : 1;
}

// Actualiza campos puntuales sin pisar el resto. Toca fecha_modificacion
// y modificado_por si existen en el mapa.
function updateFields_(sheetName, rowNum, colMap, updates, userEmail) {
  const sheet = getSheet_(sheetName);
  Object.keys(updates).forEach(function(field) {
    const col = colMap[field];
    if (!col) throw new Error('Campo desconocido: ' + field);
    sheet.getRange(rowNum, col).setValue(updates[field]);
  });
  if (colMap.fecha_modificacion) sheet.getRange(rowNum, colMap.fecha_modificacion).setValue(new Date());
  if (colMap.modificado_por && userEmail) sheet.getRange(rowNum, colMap.modificado_por).setValue(userEmail);
}

// ── CONFIG ────────────────────────────────────────────────────
function getConfig_() {
  const data = getSheet_(SHEETS.CONFIG).getDataRange().getValues();
  const config = {};
  data.forEach(function(row) { if (row[0]) config[row[0]] = row[1]; });
  return config;
}

// ── Catálogo simple (columna A, sin header de valor) ──────────
function getCatValues_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getRange('A:A').getValues().flat()
    .filter(function(v) { return v !== '' && v !== sheetName; });
}

// ── SHA-256 hex ───────────────────────────────────────────────
function computeSha256Hex_(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}
