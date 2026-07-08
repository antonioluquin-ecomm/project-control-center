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

// Carga solo las filas cuya fecha (columna dateKey del colMap) cae en
// [fechaDesde, fechaHasta] (YYYY-MM-DD, inclusive, dia completo en la TZ del script).
// Pensado para hojas tipo audit-log (HISTORIAL/LOGS/COMENTARIOS) que pueden crecer
// mucho: primero lee solo la columna de fecha (liviano) para ubicar las filas que
// matchean, y recien ahi trae el ancho completo de esas filas. No asume ningun
// orden de las filas, asi que es correcto aunque la hoja se haya reordenado a mano.
function getRowsInDateRange_(sheetName, colMap, dateKey, fechaDesde, fechaHasta) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const numRows = lastRow - 1;
  const dateCol = colMap[dateKey];
  const dates = sheet.getRange(2, dateCol, numRows, 1).getValues();
  const desde = new Date(fechaDesde + 'T00:00:00');
  const hasta = new Date(fechaHasta + 'T23:59:59.999');

  const matchRows = [];
  for (let i = 0; i < numRows; i++) {
    const v = dates[i][0];
    if (v === '' || v === null) continue;
    const d = v instanceof Date ? v : new Date(v);
    if (!isNaN(d.getTime()) && d >= desde && d <= hasta) matchRows.push(i + 2);
  }
  if (!matchRows.length) return [];

  const numCols = Math.max.apply(null, Object.keys(colMap).map(function(k) { return colMap[k]; }));
  const out = [];
  _forEachContiguousRun_(matchRows, function(startRow, count) {
    sheet.getRange(startRow, 1, count, numCols).getValues().forEach(function(r) {
      if (r[0] !== '' && r[0] !== null) out.push(rowToObj_(r, colMap));
    });
  });
  return out;
}

// Agrupa numeros de fila consecutivos en tramos, para minimizar la cantidad
// de getRange() cuando las filas que matchean son contiguas (caso tipico:
// un audit-log se escribe siempre en orden cronologico).
function _forEachContiguousRun_(rows, cb) {
  let start = rows[0];
  let count = 1;
  for (let i = 1; i <= rows.length; i++) {
    if (i < rows.length && rows[i] === start + count) { count++; continue; }
    cb(start, count);
    if (i < rows.length) { start = rows[i]; count = 1; }
  }
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

function _configFindRow_(sheet, clave) {
  const claves = sheet.getRange('A:A').getValues().flat();
  const idx = claves.indexOf(clave);
  return idx > 0 ? idx + 1 : null; // fila 1 es el header ("clave")
}

// ── Catálogos ──────────────────────────────────────────────────
// Cada catálogo (antes: una hoja CAT_* dedicada) es una fila de CONFIG:
// clave = nombre del catalogo (ej. "CAT_AREAS"), valor = CSV de sus valores.
// Un solo lugar en el Sheet para todos, editable desde Configuración > Catálogos.
function getCatValues_(catalogo) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const rowNum = _configFindRow_(sheet, catalogo);
  if (!rowNum) return [];
  const valor = sheet.getRange(rowNum, 2).getValue();
  return String(valor || '').split(',').map(function(v) { return v.trim(); }).filter(Boolean);
}

function setCatValues_(catalogo, valores) {
  const sheet = getSheet_(SHEETS.CONFIG);
  const csv = valores.map(function(v) { return String(v).trim(); }).filter(Boolean).join(',');
  const rowNum = _configFindRow_(sheet, catalogo);
  if (rowNum) sheet.getRange(rowNum, 2).setValue(csv);
  else sheet.appendRow([catalogo, csv, '']);
}

// ── Catálogo con caché por request ───────────────────────────
// Evita múltiples lecturas de CONFIG para el mismo catalogo dentro de un
// mismo request GAS. El objeto _catCache_ se reinicia en cada
// nueva ejecución (GAS no reutiliza el contexto entre requests).
const _catCache_ = {};
function getCatCached_(catalogo, fallback) {
  if (_catCache_[catalogo]) return _catCache_[catalogo];
  const vals = getCatValues_(catalogo);
  _catCache_[catalogo] = vals.length ? vals : (fallback || []);
  return _catCache_[catalogo];
}

// ── SHA-256 hex ───────────────────────────────────────────────
function computeSha256Hex_(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}
