// ============================================================
// PROJECT CONTROL CENTER — Adjuntos.gs
// Imágenes/archivos en Google Drive. Carpeta raíz → subcarpeta por proyecto.
// El frontend envía base64 (ya redimensionado); aquí se crea el archivo
// y se guarda metadata en la hoja ADJUNTOS.
// Subir: cualquier usuario autenticado. Borrar: solo Admin.
// ============================================================

// Tope defensivo de payload (≈ tras downscale del frontend). GAS y el doPost
// tienen límites de tiempo/tamaño; rechazamos archivos grandes temprano.
const ADJUNTO_MAX_BYTES = 7 * 1024 * 1024; // 7 MB

// ── LISTAR ────────────────────────────────────────────────────
function getAdjuntos_(params) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');
  const rows = getAllRows_(SHEETS.ADJUNTOS, ADJUNTOS_COLS)
    .filter(function (a) { return a.entidad === entidad && Number(a.id_entidad) === idEntidad; });
  rows.sort(function (a, b) { return new Date(b.fecha_creacion) - new Date(a.fecha_creacion); });
  return { ok: true, data: rows };
}

// ── CREAR (subir) ─────────────────────────────────────────────
function createAdjunto_(params, user) {
  const entidad = validateEnum_(params.entidad, 'entidad', ENTIDADES);
  const idEntidad = validateId_(params.id_entidad, 'id_entidad');
  const nombre = validateString_(params.nombre_archivo, 'nombre_archivo', 200);
  const mime = validateString_(params.mime, 'mime', 100);
  const b64 = String(params.data_base64 || '');
  if (!b64) return { ok: false, error: 'Archivo vacío', code: 400 };

  // Validar tamaño aproximado del base64 (4 chars ≈ 3 bytes).
  if (b64.length * 0.75 > ADJUNTO_MAX_BYTES) {
    return { ok: false, error: 'El archivo supera el máximo permitido (7 MB)', code: 413 };
  }

  // Resolver proyecto destino: las tareas guardan en la carpeta de su proyecto.
  let idProyecto = idEntidad;
  if (entidad === 'TAREA') {
    const tarea = getAllRows_(SHEETS.TAREAS, TAREAS_COLS).filter(function (t) { return Number(t.id) === idEntidad; })[0];
    if (!tarea) return { ok: false, error: 'La tarea referenciada no existe', code: 404 };
    idProyecto = Number(tarea.id_proyecto);
  } else if (!findRowNumber_(getSheet_(SHEETS.PROYECTOS), idEntidad)) {
    return { ok: false, error: 'El proyecto referenciado no existe', code: 404 };
  }

  // Crear el archivo en la subcarpeta del proyecto.
  const folder = _getProjectFolder_(idProyecto);
  const bytes = Utilities.base64Decode(b64);
  const blob = Utilities.newBlob(bytes, mime, nombre);
  const file = folder.createFile(blob);

  // Compartir por link para poder mostrar la miniatura en la UI.
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Access.VIEW); } catch (e) { /* dominio sin sharing público */ }

  const fileId = file.getId();
  const url = 'https://drive.google.com/file/d/' + fileId + '/view';
  const thumb = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w600';

  const sheet = getSheet_(SHEETS.ADJUNTOS);
  const id = getNextId_(sheet);
  const email = (user && user.email) || '';
  sheet.appendRow([id, entidad, idEntidad, nombre, fileId, url, thumb, mime, bytes.length, email, new Date()]);

  writeLog_('createAdjunto', entidad, idEntidad, 'OK', nombre, email);
  return { ok: true, data: { id: id, file_id: fileId, url: url, thumbnail_url: thumb, nombre_archivo: nombre } };
}

// ── ELIMINAR (admin) — manda el archivo a la papelera y quita la fila ──
function deleteAdjunto_(params, user) {
  const id = validateId_(params.id, 'id');
  const sheet = getSheet_(SHEETS.ADJUNTOS);
  const rowNum = findRowNumber_(sheet, id);
  if (!rowNum) return { ok: false, error: 'Adjunto no encontrado', code: 404 };

  const row = rowToObj_(sheet.getDataRange().getValues()[rowNum - 1], ADJUNTOS_COLS);
  try { if (row.file_id) DriveApp.getFileById(row.file_id).setTrashed(true); } catch (e) { /* ya no existe */ }
  sheet.deleteRow(rowNum);

  writeLog_('deleteAdjunto', row.entidad, row.id_entidad, 'OK', row.nombre_archivo, user && user.email);
  return { ok: true, data: { id: id } };
}

// ── DRIVE: carpeta raíz y subcarpeta por proyecto ─────────────
function _getRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recrear abajo */ } }
  const folder = DriveApp.createFolder('Project Control Center — Adjuntos');
  props.setProperty('DRIVE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function _getProjectFolder_(idProyecto) {
  const root = _getRootFolder_();
  const name = 'proyecto-' + idProyecto;
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
