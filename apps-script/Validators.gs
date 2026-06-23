// ============================================================
// PROJECT CONTROL CENTER — Validators.gs
// Validación de parámetros del frontend. (apps_script_standards §6)
// Todo valor externo se trata como potencialmente corrupto.
// ============================================================

function requireParam_(value, name) {
  if (value === undefined || value === null || value === '')
    throw _vErr_('Parámetro requerido: ' + name);
}

function validateString_(value, name, maxLen) {
  requireParam_(value, name);
  if (typeof value !== 'string') throw _vErr_(name + ' debe ser texto');
  const v = value.trim();
  if (v.length === 0) throw _vErr_(name + ' no puede estar vacío');
  if (maxLen && v.length > maxLen) throw _vErr_(name + ' supera el máximo de ' + maxLen + ' caracteres');
  return v;
}

// String opcional: si viene, lo valida/recorta; si no, devuelve ''.
function optionalString_(value, name, maxLen) {
  if (value === undefined || value === null || value === '') return '';
  return validateString_(value, name, maxLen);
}

function validateId_(value, name) {
  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0) throw _vErr_(name + ' debe ser un ID numérico positivo');
  return id;
}

function validateEnum_(value, name, allowed) {
  if (!allowed.includes(value)) throw _vErr_(name + ' inválido: "' + value + '". Permitidos: ' + allowed.join(', '));
  return value;
}

// Enum opcional con valor por defecto.
function optionalEnum_(value, name, allowed, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return validateEnum_(value, name, allowed);
}

// Fecha: acepta '' (→ '') o ISO/yyyy-mm-dd (→ Date).
function optionalDate_(value, name) {
  if (value === undefined || value === null || value === '') return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) throw _vErr_(name + ' no es una fecha válida');
  return d;
}

// URL opcional: '' (→ '') o URL http/https válida. Tope 1000 chars.
function optionalUrl_(value, name) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw _vErr_(name + ' debe ser texto');
  const v = value.trim();
  if (v.length === 0) return '';
  if (v.length > 1000) throw _vErr_(name + ' supera el máximo de 1000 caracteres');
  if (!/^https?:\/\/.+/i.test(v)) throw _vErr_(name + ' debe ser una URL válida (http/https)');
  return v;
}

// Error de validación (esperado): lleva code 400, no se loguea en ERRORS.
function _vErr_(mensaje) {
  const e = new Error(mensaje);
  e.code = 400;
  e.expected = true;
  return e;
}
