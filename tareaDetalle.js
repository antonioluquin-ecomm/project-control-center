/* ============================================================
   PROJECT CONTROL CENTER — tareaDetalle.js
   Modal de detalle de una tarea (estado, chips, descripción, links)
   + panel de actividad (comentarios/checklist/adjuntos/historial).
   Compartido por Tareas y Gantt. Cargar después de actividad.js.
   Requiere en la página host: STATE, ESTADO_CLASS, PRIORIDAD_CLASS,
   _sprintChip, escapeHtml, fmtDate, closeModal(), restrictWriteIfAgent().
   Uso: openTareaDetalleModal(tarea, { onEdit: fn|null, onClone: fn|null })
   ============================================================ */

let _tdOnEdit = null;
let _tdOnClone = null;
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
    t.tienda      ? '<span class="badge st-todo" style="font-size:11px">' + escapeHtml(t.tienda) + '</span>' : '',
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
    '</div>' +
    '<div id="act-com">' +
      '<div class="field" style="margin-top:12px"><textarea id="act-input" placeholder="Escribí un comentario…"></textarea></div>' +
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
