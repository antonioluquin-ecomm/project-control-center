/* ============================================================
   PROJECT CONTROL CENTER — tareaDetalle.js
   Modal de detalle de una tarea (estado, chips, descripción, links)
   + panel de actividad (comentarios/checklist/adjuntos/historial)
   + tab Informe de Gestión (info estructurada para el Portal eComm).
   Compartido por Tareas y Gantt. Cargar después de actividad.js.
   Requiere en la página host: STATE, ESTADO_CLASS, PRIORIDAD_CLASS,
   DISPOSITIVOS, _sprintChip, escapeHtml, fmtDate, _today, renderRichText,
   apiUpdateTarea, toast, closeModal(), restrictWriteIfAgent().
   Uso: openTareaDetalleModal(tarea, { onEdit: fn|null, onClone: fn|null })
   ============================================================ */

let _tdOnEdit = null;
let _tdOnClone = null;
let _tdTarea = null; // referencia a la tarea abierta, usada por el tab Informe de Gestión
function _tdEditClick() { if (_tdOnEdit) _tdOnEdit(); }
function _tdCloneClick() { if (_tdOnClone) _tdOnClone(); }
function _tdToggleDesc() {
  const wrap = document.getElementById('td-desc-wrap');
  const btn = document.getElementById('td-desc-toggle');
  if (!wrap || !btn) return;
  const expanded = wrap.classList.toggle('expanded');
  btn.textContent = expanded ? 'Ver menos' : 'Ver mas';
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function openTareaDetalleModal(t, opts) {
  opts = opts || {};
  _tdOnEdit = opts.onEdit || null;
  _tdOnClone = opts.onClone || null;
  _actCtx = { entidad: 'TAREA', id: Number(t.id) };
  _tdTarea = t;

  const cls  = ESTADO_CLASS[t.estado] || 'st-todo';
  const prc  = PRIORIDAD_CLASS[t.prioridad] || '';
  const pct  = Number(t.avance_pct) || 0;
  const venc = t.vencida ? '<span class="badge vencida" style="margin-left:4px">Vencida</span>' : '';

  const chips = [
    t.nombre_proyecto ? '<span class="badge chip-proyecto" style="font-size:11px">📁 ' + escapeHtml(t.nombre_proyecto) + '</span>' : '',
    t.tipo        ? '<span class="badge" style="font-size:11px;background:var(--card2);border:1px solid var(--line);color:var(--text2)">' + escapeHtml(t.tipo) + '</span>' : '',
    t.prioridad   ? '<span class="badge ' + prc + '" style="font-size:11px">' + escapeHtml(t.prioridad) + '</span>' : '',
    t.responsable ? '<span style="font-size:12px;color:var(--muted)">👤 ' + escapeHtml(t.responsable) + '</span>' : '',
    t.area        ? '<span class="badge st-analysis" style="font-size:11px">' + escapeHtml(t.area) + '</span>' : '',
    t.tienda      ? '<span class="badge ' + (TIENDA_CLASS[t.tienda] || 'st-todo') + '" style="font-size:11px">' + escapeHtml(t.tienda) + '</span>' : '',
    t.id_sprint   ? _sprintChip(t.id_sprint, '11px') : '',
  ].filter(Boolean).join('');

  const metaParts = [
    '<div class="avance-bar">' +
      '<div class="avance-track" style="width:80px"><div class="avance-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="mono" style="font-size:12px;color:var(--muted)">' + pct + '% avance</span>' +
    '</div>',
    t.fecha_inicio ? '<span style="font-size:12px;color:var(--muted)">Inicio: <b>' + fmtDate(t.fecha_inicio) + '</b></span>' : '',
    t.fecha_limite ? '<span style="font-size:12px;color:var(--muted)">Vence: <b>' + fmtDate(t.fecha_limite) + '</b></span>' : '',
  ].filter(Boolean).join('');

  const extLinks = [
    { url: t.url_jira,            label: 'Jira' },
    { url: t.url_gitlab,          label: 'GitLab' },
    { url: t.url_figma_prototipo, label: 'Figma proto' },
    { url: t.url_figma_editable,  label: 'Figma edit' },
    { url: t.url_informe_gestion, label: 'Informe gestion' },
  ].filter(function (l) { return l.url; }).map(function (l) {
    return '<a class="link-chip" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">↗ ' + escapeHtml(l.label) + '</a>';
  }).join('');

  const descText = String(t.descripcion || '');
  const descLong = descText.length > 900 || descText.split('\n').length > 16;
  const descBlock = t.descripcion
    ? '<div class="td-desc-wrap' + (descLong ? ' is-collapsed' : '') + '" id="td-desc-wrap">' +
        '<div class="td-desc" id="td-desc">' + renderRichText(t.descripcion) + '</div>' +
        (descLong ? '<button class="td-desc-toggle" id="td-desc-toggle" type="button" aria-expanded="false" onclick="_tdToggleDesc()">Ver mas</button>' : '') +
      '</div>'
    : '';

  const editBtn = _tdOnEdit ? '<button class="secondary sm admin-only" onclick="_tdEditClick()">Editar</button>' : '';
  const cloneBtn = _tdOnClone ? '<button class="secondary sm admin-only" onclick="_tdCloneClick()">Clonar</button>' : '';

  // Autocompletado compartido por Informe de Gestión y Requerimiento: sale de
  // la propia tarea (sección/dispositivos ya son dimensiones de la tarea,
  // completadas desde el form de edición — acá solo se muestran).
  const dimAuto = function (extra) {
    return [
      ['Proyecto', t.nombre_proyecto],
      ['Tienda', t.tienda],
      ['Sección', t.seccion],
      ['Dispositivos', t.dispositivos],
    ].concat(extra || []).map(function (pair) {
      return '<span style="font-size:12px;color:var(--muted)">' + pair[0] + ': <b style="color:var(--text)">' + escapeHtml(pair[1] || '—') + '</b></span>';
    }).join('');
  };

  // ── Informe de Gestión ──────────────────────────────────────
  const infCampos = ['informe_version', 'informe_descripcion_general', 'informe_detalles_tecnicos', 'informe_resultado'];
  const infCompletos = infCampos.filter(function (k) { return t[k] && String(t[k]).trim(); }).length;
  const infDestacado = t.estado === 'Documentación';
  const infBadge = '<span class="chk-tab-badge' + (infCompletos === infCampos.length ? ' chk-tab-complete' : '') + '" id="inf-tab-badge">' + infCompletos + '/' + infCampos.length + '</span>';
  const infAuto = dimAuto([
    ['Área responsable', t.area],
    ['Responsable', t.responsable],
    ['Estado', t.estado],
    ['Fecha de creación', t.fecha_creacion ? fmtDate(t.fecha_creacion) : ''],
  ]);

  // ── Requerimiento (brief Jira/GitLab) ────────────────────────
  const reqCampos = ['requerimiento_texto', 'requerimiento_detalles', 'requerimiento_objetivo'];
  const reqCompletos = reqCampos.filter(function (k) { return t[k] && String(t[k]).trim(); }).length;
  const reqDestacado = t.area === 'InfraCommerce' || t.area === 'PIM';
  const reqBadge = '<span class="chk-tab-badge' + (reqCompletos === reqCampos.length ? ' chk-tab-complete' : '') + '" id="req-tab-badge">' + reqCompletos + '/' + reqCampos.length + '</span>';
  const reqAuto = dimAuto();

  document.getElementById('modals').innerHTML =
    '<div class="modal-overlay"><div class="modal td-modal">' +
    '<div class="td-header-top">' +
      '<span class="badge ' + cls + '">' + escapeHtml(t.estado) + '</span>' + venc +
      '<div class="td-header-actions">' +
        editBtn +
        cloneBtn +
        '<button class="secondary sm" onclick="closeModal()">X</button>' +
      '</div>' +
    '</div>' +
    '<h3 class="td-title">' + escapeHtml(t.titulo) + '</h3>' +
    (chips ? '<div class="td-chips">' + chips + '</div>' : '') +
    '<div class="td-meta">' + metaParts + '</div>' +
    (extLinks ? '<div class="td-links">' + extLinks + '</div>' : '') +
    descBlock +
    '<hr class="td-sep" />' +
    '<div class="act-tabs">' +
      '<button class="act-tab active" id="act-tab-com" onclick="_actShow(\'com\')">Comentarios</button>' +
      '<button class="act-tab" id="act-tab-chk" onclick="_actShow(\'chk\')">Checklist</button>' +
      '<button class="act-tab" id="act-tab-adj" onclick="_actShow(\'adj\')">Adjuntos</button>' +
      '<button class="act-tab" id="act-tab-his" onclick="_actShow(\'his\')">Historial</button>' +
      '<button class="act-tab' + (reqDestacado ? ' act-tab-highlight' : '') + '" id="act-tab-req" onclick="_actShow(\'req\')">Requerimiento ' + reqBadge + '</button>' +
      '<button class="act-tab' + (infDestacado ? ' act-tab-highlight' : '') + '" id="act-tab-inf" onclick="_actShow(\'inf\')">Informe de gestión ' + infBadge + '</button>' +
    '</div>' +
    '<div id="act-com">' +
      '<div class="field" style="margin-top:12px"><textarea id="act-input" placeholder="Escribí un comentario… Usá **negrita**, # título o - viñeta"></textarea></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button id="act-send" class="sm" onclick="_actSend()">Comentar</button></div>' +
      '<div id="act-com-list"><div class="text-muted" style="font-size:13px">Cargando…</div></div>' +
    '</div>' +
    '<div id="act-chk" hidden>' +
      '<div id="act-chk-progress" class="chk-progress" style="margin-top:12px"></div>' +
      '<div id="act-chk-list" style="margin:8px 0"><div class="text-muted" style="font-size:13px">Cargando…</div></div>' +
      '<div class="field" style="display:flex;gap:8px;align-items:center">' +
        '<input id="act-chk-input" placeholder="Nuevo ítem…" class="admin-only" style="flex:1" onkeydown="if(event.key===\'Enter\'){event.preventDefault();_actAddChecklist();}" />' +
        '<button id="act-chk-add" class="sm admin-only" onclick="_actAddChecklist()">Agregar</button>' +
      '</div>' +
    '</div>' +
    '<div id="act-adj" hidden>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:12px 0">' +
        '<input type="file" id="act-file" accept="image/*" multiple style="font-size:12px" />' +
        '<span id="act-upstatus" class="text-muted" style="font-size:12px"></span>' +
      '</div>' +
      '<div id="act-adj-list" class="adj-grid"><div class="text-muted" style="font-size:13px">Cargando…</div></div>' +
    '</div>' +
    '<div id="act-his" hidden><div id="act-his-list" style="margin-top:12px"><div class="text-muted" style="font-size:13px">Cargando…</div></div></div>' +
    '<div id="act-req" hidden>' +
      '<div class="td-meta" style="margin-top:12px">' + reqAuto + '</div>' +
      '<div class="field"><label style="display:flex;align-items:center;justify-content:space-between;gap:8px">Requerimiento <button type="button" class="secondary sm admin-only" style="margin:0" onclick="_reqPrellenar()">Prellenar desde Descripción</button></label><textarea id="req-texto" class="admin-only" rows="3" oninput="_reqActualizarBadge()">' + escapeHtml(t.requerimiento_texto || '') + '</textarea></div>' +
      '<div class="field"><label>Detalles</label><textarea id="req-detalles" class="admin-only" rows="3" oninput="_reqActualizarBadge()">' + escapeHtml(t.requerimiento_detalles || '') + '</textarea></div>' +
      '<div class="field"><label>Objetivo</label><textarea id="req-objetivo" class="admin-only" rows="3" oninput="_reqActualizarBadge()">' + escapeHtml(t.requerimiento_objetivo || '') + '</textarea></div>' +
      '<div class="text-muted" style="font-size:12px;margin-bottom:12px">Brief para crear el ticket en Jira (InfraCommerce) o GitLab (PIM). Sección y dispositivos se editan desde "Editar tarea".</div>' +
      '<div id="req-status" class="status-bar" style="display:none;margin-bottom:10px"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button class="secondary sm" onclick="_reqVistaPrevia()">Vista previa</button>' +
        '<button class="secondary sm" onclick="_reqCopiar()">Copiar</button>' +
        '<button class="secondary sm" onclick="_reqExportarMd()">Exportar .md</button>' +
        '<button id="req-save-btn" class="sm admin-only" onclick="_reqGuardar()">Guardar requerimiento</button>' +
      '</div>' +
    '</div>' +
    '<div id="act-inf" hidden>' +
      '<div class="td-meta" style="margin-top:12px">' + infAuto + '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>Fecha de implementación</label><input type="date" id="inf-fecha-impl" class="admin-only" value="' + (t.informe_fecha_implementacion ? String(t.informe_fecha_implementacion).slice(0, 10) : _today()) + '" onchange="_infActualizarBadge()" /></div>' +
        '<div class="field"><label>Versión</label><input type="text" id="inf-version" class="admin-only" maxlength="60" value="' + escapeHtml(t.informe_version || '') + '" oninput="_infActualizarBadge()" /></div>' +
      '</div>' +
      '<div class="field"><label>Descripción general</label><textarea id="inf-desc-general" class="admin-only" rows="3" oninput="_infActualizarBadge()">' + escapeHtml(t.informe_descripcion_general || '') + '</textarea></div>' +
      '<div class="field"><label>Detalles técnicos o funcionales</label><textarea id="inf-detalles-tec" class="admin-only" rows="3" oninput="_infActualizarBadge()">' + escapeHtml(t.informe_detalles_tecnicos || '') + '</textarea></div>' +
      '<div class="field"><label>Resultado</label><textarea id="inf-resultado" class="admin-only" rows="3" oninput="_infActualizarBadge()">' + escapeHtml(t.informe_resultado || '') + '</textarea></div>' +
      '<div class="text-muted" style="font-size:12px;margin-bottom:12px">Imagen o video ilustrativo: se gestiona desde <a href="javascript:void(0)" onclick="_actShow(\'adj\')">el tab Adjuntos</a>. Sección y dispositivos se editan desde "Editar tarea".</div>' +
      '<div id="inf-status" class="status-bar" style="display:none;margin-bottom:10px"></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button class="secondary sm" onclick="_infVistaPrevia()">Vista previa</button>' +
        '<button class="secondary sm" onclick="_infCopiar()">Copiar</button>' +
        '<button class="secondary sm" onclick="_infExportarMd()">Exportar .md</button>' +
        '<button id="inf-save-btn" class="sm admin-only" onclick="_infGuardar()">Guardar informe</button>' +
      '</div>' +
    '</div>' +
    '<div class="modal-actions"><button class="secondary" onclick="closeModal()">Cerrar</button></div>' +
    '</div></div>';

  const fi = document.getElementById('act-file');
  if (fi) fi.addEventListener('change', _actUpload);
  restrictWriteIfAgent();
  _actLoadComentarios();
  _actLoadChecklist();
  _actLoadAdjuntos();
  _actLoadHistorial();
}

function _fechaDmy_(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : '';
}

/* ─── Informe de Gestión ─────────────────────────────────────
   Sección/Dispositivos ya no se editan acá (son dimensiones de la tarea,
   ver form de edición) — este tab solo los muestra vía dimAuto(). Los
   campos manuales viven en el DOM (inf-*) y se leen recién al
   guardar/copiar/exportar/previsualizar. */

function _infActualizarBadge() {
  const campos = ['inf-version', 'inf-desc-general', 'inf-detalles-tec', 'inf-resultado'];
  let completos = 0;
  campos.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.value.trim()) completos++;
  });
  const badge = document.getElementById('inf-tab-badge');
  if (badge) {
    badge.textContent = completos + '/' + campos.length;
    badge.classList.toggle('chk-tab-complete', completos === campos.length);
  }
}

function _infDatos_() {
  return {
    informe_version: (document.getElementById('inf-version').value || '').trim(),
    informe_fecha_implementacion: document.getElementById('inf-fecha-impl').value || '',
    informe_descripcion_general: (document.getElementById('inf-desc-general').value || '').trim(),
    informe_detalles_tecnicos: (document.getElementById('inf-detalles-tec').value || '').trim(),
    informe_resultado: (document.getElementById('inf-resultado').value || '').trim(),
  };
}

async function _infGuardar() {
  if (!_tdTarea) return;
  const btn = document.getElementById('inf-save-btn');
  const st = document.getElementById('inf-status');
  if (btn) btn.disabled = true;
  try {
    const datos = _infDatos_();
    datos.id = _tdTarea.id;
    await apiUpdateTarea(datos);
    Object.assign(_tdTarea, datos);
    if (st) { st.style.display = ''; st.className = 'status-bar success'; st.textContent = 'Informe guardado.'; }
    toast('✓', 'Informe de gestión guardado', 'success');
  } catch (e) {
    if (st) { st.style.display = ''; st.className = 'status-bar error'; st.textContent = e.message; }
    toast('✕', e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function _infMarkdown_() {
  const t = _tdTarea || {};
  const d = _infDatos_();
  return [
    '# ' + (t.titulo || ''),
    '',
    '- **Proyecto:** ' + (t.nombre_proyecto || ''),
    '- **Tienda:** ' + (t.tienda || ''),
    '- **Sección:** ' + (t.seccion || ''),
    '- **Dispositivos:** ' + (t.dispositivos || ''),
    '- **Versión:** ' + (d.informe_version || ''),
    '- **Fecha de implementación:** ' + _fechaDmy_(d.informe_fecha_implementacion),
    '',
    '## Descripción general',
    d.informe_descripcion_general || '_(sin completar)_',
    '',
    '## Detalles técnicos o funcionales',
    d.informe_detalles_tecnicos || '_(sin completar)_',
    '',
    '## Resultado',
    d.informe_resultado || '_(sin completar)_',
  ].join('\n');
}

function _infCopiar() {
  navigator.clipboard.writeText(_infMarkdown_()).then(function () {
    toast('📋', 'Informe copiado al portapapeles', 'success');
  }).catch(function () {
    toast('✕', 'No se pudo copiar al portapapeles', 'error');
  });
}

function _infExportarMd() {
  const blob = new Blob([_infMarkdown_()], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'informe-' + (_tdTarea ? _tdTarea.id : 'tarea') + '.md' });
  a.click();
  URL.revokeObjectURL(url);
}

function _infVistaPrevia() {
  document.getElementById('modals').insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" id="inf-preview-overlay" onclick="if(event.target===this) this.remove()">' +
      '<div class="modal">' +
        '<h3>Vista previa del informe</h3>' +
        '<div class="td-desc">' + renderRichText(_infMarkdown_()) + '</div>' +
        '<div class="modal-actions"><button class="secondary" onclick="document.getElementById(\'inf-preview-overlay\').remove()">Cerrar</button></div>' +
      '</div>' +
    '</div>');
}

/* ─── Requerimiento (brief para Jira/GitLab) ─────────────────
   Mismo patrón que Informe de Gestión: autocompletado vía dimAuto(),
   campos manuales (req-*) leídos al guardar/copiar/exportar/previsualizar. */

// Copia la Descripción de la tarea al campo Requerimiento como borrador
// inicial (flujo provisorio: redactar una vez, pulir afuera con IA si hace
// falta, y pegar el resultado acá o de vuelta en la Descripción).
function _reqPrellenar() {
  if (!_tdTarea) return;
  const desc = String(_tdTarea.descripcion || '').trim();
  if (!desc) { toast('⚠', 'La tarea no tiene descripción para copiar.', 'error'); return; }
  const campo = document.getElementById('req-texto');
  if (campo.value.trim() && !confirm('Ya hay texto en Requerimiento. ¿Reemplazarlo con la Descripción de la tarea?')) return;
  campo.value = desc;
  _reqActualizarBadge();
}

function _reqActualizarBadge() {
  const campos = ['req-texto', 'req-detalles', 'req-objetivo'];
  let completos = 0;
  campos.forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.value.trim()) completos++;
  });
  const badge = document.getElementById('req-tab-badge');
  if (badge) {
    badge.textContent = completos + '/' + campos.length;
    badge.classList.toggle('chk-tab-complete', completos === campos.length);
  }
}

function _reqDatos_() {
  return {
    requerimiento_texto: (document.getElementById('req-texto').value || '').trim(),
    requerimiento_detalles: (document.getElementById('req-detalles').value || '').trim(),
    requerimiento_objetivo: (document.getElementById('req-objetivo').value || '').trim(),
  };
}

async function _reqGuardar() {
  if (!_tdTarea) return;
  const btn = document.getElementById('req-save-btn');
  const st = document.getElementById('req-status');
  if (btn) btn.disabled = true;
  try {
    const datos = _reqDatos_();
    datos.id = _tdTarea.id;
    await apiUpdateTarea(datos);
    Object.assign(_tdTarea, datos);
    if (st) { st.style.display = ''; st.className = 'status-bar success'; st.textContent = 'Requerimiento guardado.'; }
    toast('✓', 'Requerimiento guardado', 'success');
  } catch (e) {
    if (st) { st.style.display = ''; st.className = 'status-bar error'; st.textContent = e.message; }
    toast('✕', e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function _reqMarkdown_() {
  const t = _tdTarea || {};
  const d = _reqDatos_();
  return [
    '# ' + (t.titulo || ''),
    '',
    '- **Proyecto:** ' + (t.nombre_proyecto || ''),
    '- **Tienda:** ' + (t.tienda || ''),
    '- **Sección:** ' + (t.seccion || ''),
    '- **Dispositivos:** ' + (t.dispositivos || ''),
    '',
    '## Requerimiento',
    d.requerimiento_texto || '_(sin completar)_',
    '',
    '## Detalles',
    d.requerimiento_detalles || '_(sin completar)_',
    '',
    '## Objetivo',
    d.requerimiento_objetivo || '_(sin completar)_',
  ].join('\n');
}

function _reqCopiar() {
  navigator.clipboard.writeText(_reqMarkdown_()).then(function () {
    toast('📋', 'Requerimiento copiado al portapapeles', 'success');
  }).catch(function () {
    toast('✕', 'No se pudo copiar al portapapeles', 'error');
  });
}

function _reqExportarMd() {
  const blob = new Blob([_reqMarkdown_()], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'requerimiento-' + (_tdTarea ? _tdTarea.id : 'tarea') + '.md' });
  a.click();
  URL.revokeObjectURL(url);
}

function _reqVistaPrevia() {
  document.getElementById('modals').insertAdjacentHTML('beforeend',
    '<div class="modal-overlay" id="req-preview-overlay" onclick="if(event.target===this) this.remove()">' +
      '<div class="modal">' +
        '<h3>Vista previa del requerimiento</h3>' +
        '<div class="td-desc">' + renderRichText(_reqMarkdown_()) + '</div>' +
        '<div class="modal-actions"><button class="secondary" onclick="document.getElementById(\'req-preview-overlay\').remove()">Cerrar</button></div>' +
      '</div>' +
    '</div>');
}
