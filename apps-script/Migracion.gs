// ============================================================
// PROJECT CONTROL CENTER — Migracion.gs
// Importa proyectos y tareas activos desde el export de Jira.
//
// Uso:
//   1) Subí el CSV de Jira a Google Drive.
//   2) En Script Properties agregá: JIRA_CSV_FILE_ID = <id del archivo>
//   3) Ejecutá runMigracion() desde el editor GAS.
//   4) Revisá LOGS y el Sheet; si algo está mal, corrí limpiarMigracion()
//      y volvé a correr después de ajustar.
// ============================================================

// ── Mapeo de estados Jira → PCC ──────────────────────────────
const _ESTADO_MAP = {
  'Por Hacer':          'Por Hacer',
  'En Análisis':        'En Análisis',
  'Maquetación':        'Maquetación',
  'En Curso':           'En Curso',
  'Control de calidad': 'QA',
  'QA':                 'QA',
  'Documentación':      'Documentación',
  'Presentación':       'Documentación',
  'Revisión':           'Revisión',
};

// Estados que se omiten (no se migran).
const _ESTADOS_OMITIR = ['Finalizada', 'Finalizado', 'Cancelada', 'Cancelado'];

// Mapeo de tipos Jira → PCC (Epic se convierte en PROYECTO, no en tarea).
const _TIPO_MAP = {
  'Historia': 'Historia',
  'Tarea':    'Tarea',
  'Error':    'Error',
  'Subtarea': 'Subtarea',
  'Epic':     null, // → PROYECTO
};

// Mapeo de prioridades Jira → PCC.
const _PRIORIDAD_MAP = {
  'Highest': 'Highest', 'Blocker': 'Highest',
  'High':    'High',    'Critical': 'High',
  'Medium':  'Medium',
  'Low':     'Low',
  'Lowest':  'Lowest',  'Trivial': 'Lowest',
};

// ── Índices de columnas en el CSV (0-based, confirmados del export) ──
const _COL = {
  resumen:       0,
  clave:         1,
  tipo:          3,
  estado:        4,
  nombreProy:    6,
  prioridad:     11,
  asignado:      13,
  creada:        19,
  vencimiento:   23,
  descripcion:   30,
  fechaInicio:   131,
  avancePct:     141,
  claveParent:   203, // "Clave principal" (Epic al que pertenece la tarea)
};

// ── Punto de entrada ─────────────────────────────────────────
function runMigracion() {
  const fileId = PropertiesService.getScriptProperties().getProperty('JIRA_CSV_FILE_ID');
  if (!fileId) {
    throw new Error('Falta Script Property: JIRA_CSV_FILE_ID. Subí el CSV a Drive y pegá su ID.');
  }

  const csvContent = DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8');
  const rows       = _parseCSV_(csvContent);
  const headers    = rows[0];

  Logger.log('CSV leído. Filas totales: ' + (rows.length - 1));

  // ── Paso 1: indexar Epics → crear Proyectos ──────────────
  const epicMap   = {}; // claveEpic → id PCC
  const epicRows  = rows.slice(1).filter(function(r) { return r[_COL.tipo] === 'Epic'; });
  const proySheet = getSheet_(SHEETS.PROYECTOS);

  let proyCreados = 0, proyOmitidos = 0;
  epicRows.forEach(function(r) {
    const estado = _ESTADO_MAP[r[_COL.estado]];
    if (!estado) { proyOmitidos++; return; } // estado final → omitir

    const id   = getNextId_(proySheet);
    const now  = new Date().toISOString();
    const prio = _PRIORIDAD_MAP[r[_COL.prioridad]] || 'Medium';
    const fIni = _parseJiraDate_(r[_COL.fechaInicio]);
    const fFin = _parseJiraDate_(r[_COL.vencimiento]);

    proySheet.appendRow([
      id,
      r[_COL.resumen].trim(),
      r[_COL.descripcion].trim().slice(0, 2000),
      estado,
      prio,
      r[_COL.asignado].trim(),
      '', // sitio — vacío, asignar manualmente si hace falta
      fIni,
      fFin,
      'Migrado desde Jira: ' + r[_COL.clave],
      now, now,
      'migracion', 'migracion',
    ]);

    epicMap[r[_COL.clave]] = id;
    proyCreados++;
  });

  Logger.log('Proyectos creados: ' + proyCreados + ' | Omitidos (finalizados): ' + proyOmitidos);

  // ── Paso 2: crear Tareas (no-Epic, no-finalizadas) ───────
  const tareasSheet = getSheet_(SHEETS.TAREAS);
  const tareasRows  = rows.slice(1).filter(function(r) {
    return r[_COL.tipo] !== 'Epic';
  });

  // Proyecto de "sin epic" — se crea solo si hay tareas huérfanas activas.
  let idProyHuerfano = null;

  let tarCreadas = 0, tarOmitidas = 0, tarHuerfanas = 0;
  tareasRows.forEach(function(r) {
    const estado = _ESTADO_MAP[r[_COL.estado]];
    if (!estado) { tarOmitidas++; return; }

    const tipo  = _TIPO_MAP[r[_COL.tipo]] || 'Tarea';
    const prio  = _PRIORIDAD_MAP[r[_COL.prioridad]] || 'Medium';
    const fIni  = _parseJiraDate_(r[_COL.fechaInicio]);
    const fLim  = _parseJiraDate_(r[_COL.vencimiento]);
    const av    = parseInt(r[_COL.avancePct], 10) || 0;

    // Resolver proyecto padre (via clave del Epic padre en Jira).
    const claveParent = r[_COL.claveParent] ? r[_COL.claveParent].trim() : '';
    let idProyecto = epicMap[claveParent] || null;

    if (!idProyecto) {
      // Sin epic → asignar a proyecto "Sin épica / Tareas sueltas".
      if (!idProyHuerfano) {
        idProyHuerfano = _ensureProyectoHuerfano_(proySheet);
      }
      idProyecto = idProyHuerfano;
      tarHuerfanas++;
    }

    const now = new Date().toISOString();
    tareasSheet.appendRow([
      getNextId_(tareasSheet),
      idProyecto,
      r[_COL.resumen].trim(),
      r[_COL.descripcion].trim().slice(0, 2000),
      tipo,
      estado,
      prio,
      r[_COL.asignado].trim(),
      fIni,
      fLim,
      av,
      0, // orden
      now, now,
      'migracion', 'migracion',
    ]);
    tarCreadas++;
  });

  Logger.log('Tareas creadas: ' + tarCreadas + ' | Omitidas (finalizadas): ' + tarOmitidas + ' | Sin épica: ' + tarHuerfanas);
  Logger.log('✓ Migración completa.');

  writeLog_('runMigracion', 'MIGRACION', null, 'ok',
    'Proyectos: ' + proyCreados + ' | Tareas: ' + tarCreadas, 'migracion');
}

// Crea (o reutiliza) el proyecto catch-all para tareas sin épica.
function _ensureProyectoHuerfano_(proySheet) {
  const data = proySheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === 'Sin épica — Tareas sueltas') return data[i][0];
  }
  const id  = getNextId_(proySheet);
  const now = new Date().toISOString();
  proySheet.appendRow([id, 'Sin épica — Tareas sueltas', 'Tareas migradas de Jira sin épica asociada.',
    'En Curso', 'Medium', '', '', '', '', 'Generado por migración Jira.',
    now, now, 'migracion', 'migracion']);
  return id;
}

// Elimina todas las filas marcadas como creadas por 'migracion' (para re-correr).
function limpiarMigracion() {
  [SHEETS.PROYECTOS, SHEETS.TAREAS].forEach(function(name) {
    const sheet = getSheet_(name);
    const data  = sheet.getDataRange().getValues();
    // Buscar columna "creado_por" (última columna de auditoría antes de modificado_por).
    const headers    = data[0];
    const creadoPorI = headers.indexOf('creado_por');
    if (creadoPorI === -1) return;

    // Recorrer de abajo hacia arriba para no desfasar índices.
    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][creadoPorI]).trim() === 'migracion') {
        sheet.deleteRow(i + 1);
      }
    }
    Logger.log('✓ ' + name + ' limpio.');
  });
}

// ── Parser CSV robusto (campos con comillas y saltos de línea) ─
function _parseCSV_(text) {
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { inQ = false; i++; continue; }
      field += ch;
    } else {
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') {
        row.push(field); rows.push(row);
        row = []; field = ''; i++;
        // Saltar \r\n completo si es Windows.
        if (text[i - 1] === '\r') {} // ya avanzó
        continue;
      }
      if (ch === '\r') { i++; continue; } // ignorar CR solo
      field += ch;
    }
    i++;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Convierte "dd/mmm/yy h:mm AM/PM" (formato Jira) a ISO date string o ''.
function _parseJiraDate_(str) {
  if (!str || !str.trim()) return '';
  try {
    const d = new Date(str.trim());
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch (e) { return ''; }
}
