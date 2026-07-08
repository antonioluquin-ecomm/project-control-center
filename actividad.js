/* ============================================================
   PROJECT CONTROL CENTER — actividad.js
   Panel reutilizable de Comentarios + Historial para PROYECTO/TAREA.
   Cargar tras api.js. Uso: openActividad('TAREA', id, 'Título').
   Comentar está disponible para cualquier usuario autenticado.
   ============================================================ */

let _actCtx = { entidad: null, id: null };

function openActividad(entidad, idEntidad, titulo) {
  _actCtx = { entidad: entidad, id: Number(idEntidad) };
  document.getElementById('modals').innerHTML =
    '<div class="modal-overlay"><div class="modal" style="max-width:560px">' +
    '<h3>Actividad — ' + escapeHtml(titulo || (entidad + ' #' + idEntidad)) + '</h3>' +
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
    '<div class="modal-actions"><button class="secondary" onclick="closeActividad()">Cerrar</button></div>' +
    '</div></div>';
  _actLoadComentarios();
  _actLoadChecklist();
  _actLoadAdjuntos();
  _actLoadHistorial();
  const fi = document.getElementById('act-file');
  if (fi) fi.addEventListener('change', _actUpload);
}

function closeActividad() { document.getElementById('modals').innerHTML = ''; }

function _actShow(which) {
  // 'inf'/'req' (Informe de Gestión / Requerimiento) solo existen en el modal
  // de detalle de tarea; en el panel genérico de openActividad() esos ids no
  // existen y el guard de abajo (if panel/if tab) simplemente no hace nada.
  ['com', 'chk', 'adj', 'his', 'inf', 'req'].forEach(function (k) {
    const panel = document.getElementById('act-' + k);
    const tab = document.getElementById('act-tab-' + k);
    if (panel) panel.hidden = k !== which;
    if (tab) tab.classList.toggle('active', k === which);
  });
}

async function _actLoadComentarios() {
  const wrap = document.getElementById('act-com-list');
  try {
    const rows = await apiGetComentarios(_actCtx.entidad, _actCtx.id);
    if (!wrap) return;
    const myEmail = (typeof SESSION !== 'undefined' && SESSION) ? (SESSION.email || '') : '';
    wrap.innerHTML = rows.length ? rows.map(function (c) {
      const esPropio = myEmail && c.usuario === myEmail;
      const editadoTag = c.fecha_edicion ? ' <span class="act-edited">(editado)</span>' : '';
      const editBtn = esPropio ? '<button class="act-edit-btn" onclick="_actEditComentario(' + c.id + ')">Editar</button>' : '';
      return '<div class="act-item" id="act-com-' + c.id + '" data-texto="' + escapeHtml(c.texto) + '">' +
        '<div class="act-meta">' +
          '<b>' + escapeHtml(c.usuario || '—') + '</b>' +
          '<div class="act-meta-right">' +
            '<span>' + _actWhen(c.fecha_creacion) + editadoTag + '</span>' +
            editBtn +
          '</div>' +
        '</div>' +
        '<div class="act-text">' + escapeHtml(c.texto) + '</div>' +
        '</div>';
    }).join('') : '<div class="text-muted" style="font-size:13px">Sin comentarios todavía.</div>';
  } catch (e) { if (wrap) wrap.innerHTML = '<div class="status-bar error">' + escapeHtml(e.message) + '</div>'; }
}

function _actEditComentario(id) {
  const item = document.getElementById('act-com-' + id);
  if (!item) return;
  const texto = item.getAttribute('data-texto') || '';
  const textDiv = item.querySelector('.act-text');
  const editBtn = item.querySelector('.act-edit-btn');
  if (textDiv) {
    textDiv.innerHTML =
      '<textarea id="act-com-ta-' + id + '" class="act-edit-ta" rows="3">' + escapeHtml(texto) + '</textarea>' +
      '<div class="act-edit-actions">' +
        '<button class="sm" onclick="_actSaveComentario(' + id + ')">Guardar</button>' +
        '<button class="sm secondary" onclick="_actLoadComentarios()">Cancelar</button>' +
      '</div>';
  }
  if (editBtn) editBtn.style.display = 'none';
}

async function _actSaveComentario(id) {
  const ta = document.getElementById('act-com-ta-' + id);
  if (!ta) return;
  const texto = ta.value.trim();
  if (!texto) return;
  const item = document.getElementById('act-com-' + id);
  const btns = item ? item.querySelectorAll('button') : [];
  btns.forEach(function (b) { b.disabled = true; });
  try {
    await apiUpdateComentario(id, texto);
    toast('✓', 'Comentario actualizado', 'success');
    _actLoadComentarios();
  } catch (e) {
    toast('✕', e.message, 'error');
    btns.forEach(function (b) { b.disabled = false; });
  }
}

async function _actLoadHistorial() {
  const wrap = document.getElementById('act-his-list');
  try {
    const rows = await apiGetHistorial(_actCtx.entidad, _actCtx.id);
    if (!wrap) return;
    wrap.innerHTML = rows.length ? rows.map(function (h) {
      const ant = h.valor_anterior ? escapeHtml(h.valor_anterior) : '∅';
      return '<div class="act-item act-hist">' +
        '<div class="act-meta"><b>' + escapeHtml(h.campo) + '</b><span>' + _actWhen(h.timestamp) + '</span></div>' +
        '<div class="act-text"><span class="hist-old">' + ant + '</span> → <span class="hist-new">' + escapeHtml(h.valor_nuevo || '∅') + '</span>' +
        '<div class="text-muted" style="font-size:11px;margin-top:2px">' + escapeHtml(h.usuario || '') + '</div></div></div>';
    }).join('') : '<div class="text-muted" style="font-size:13px">Sin cambios registrados.</div>';
  } catch (e) { if (wrap) wrap.innerHTML = '<div class="status-bar error">' + escapeHtml(e.message) + '</div>'; }
}

async function _actSend() {
  const input = document.getElementById('act-input');
  const texto = (input.value || '').trim();
  if (!texto) return;
  const btn = document.getElementById('act-send'); btn.disabled = true;
  try {
    await apiCreateComentario(_actCtx.entidad, _actCtx.id, texto);
    input.value = '';
    toast('✓', 'Comentario agregado', 'success');
    _actLoadComentarios();
  } catch (e) { toast('✕', e.message, 'error'); }
  finally { btn.disabled = false; }
}

/* ─── CHECKLIST ──────────────────────────────────────────── */

async function _actLoadChecklist() {
  const wrap = document.getElementById('act-chk-list');
  const prog = document.getElementById('act-chk-progress');
  try {
    const rows = await apiGetChecklist(_actCtx.entidad, _actCtx.id);
    if (!wrap) return;
    const total = rows.length;
    const hechos = rows.filter(function (c) { return String(c.hecho) === 'SI'; }).length;
    const pct = total ? Math.round(hechos / total * 100) : 0;
    if (prog) {
      prog.innerHTML = total
        ? '<div class="chk-bar"><div class="chk-fill' + (pct === 100 ? ' chk-complete' : '') + '" style="width:' + pct + '%"></div></div>' +
          '<span class="chk-count">' + hechos + '/' + total + ' (' + pct + '%)</span>'
        : '';
    }
    const tab = document.getElementById('act-tab-chk');
    if (tab) {
      const pendientes = total - hechos;
      tab.innerHTML = 'Checklist' + (total
        ? ' <span class="chk-tab-badge' + (pendientes === 0 ? ' chk-tab-complete' : '') + '">' + hechos + '/' + total + '</span>'
        : '');
    }
    wrap.innerHTML = total ? rows.map(function (c) {
      const done = String(c.hecho) === 'SI';
      return '<div class="chk-item' + (done ? ' chk-done' : '') + '">' +
        '<label class="chk-label">' +
        '<input type="checkbox" class="chk-cb admin-only" ' + (done ? 'checked' : '') + ' onchange="_actToggleChecklist(' + c.id + ', this.checked)" />' +
        '<span>' + escapeHtml(c.texto) + '</span></label>' +
        '<button class="chk-del admin-only" title="Eliminar" onclick="_actDeleteChecklist(' + c.id + ')">✕</button>' +
        '</div>';
    }).join('') : '<div class="text-muted" style="font-size:13px;padding:12px 0">Sin ítems todavía.</div>';
    if (typeof restrictWriteIfAgent === 'function') restrictWriteIfAgent();
  } catch (e) { if (wrap) wrap.innerHTML = '<div class="status-bar error">' + escapeHtml(e.message) + '</div>'; }
}

async function _actAddChecklist() {
  const input = document.getElementById('act-chk-input');
  const texto = (input.value || '').trim();
  if (!texto) return;
  const btn = document.getElementById('act-chk-add'); if (btn) btn.disabled = true;
  try {
    await apiCreateChecklistItem(_actCtx.entidad, _actCtx.id, texto);
    input.value = '';
    _actLoadChecklist();
  } catch (e) { toast('✕', e.message, 'error'); }
  finally { if (btn) btn.disabled = false; }
}

async function _actToggleChecklist(id, checked) {
  try { await apiToggleChecklistItem(id, checked ? 'SI' : 'NO'); _actLoadChecklist(); }
  catch (e) { toast('✕', e.message, 'error'); _actLoadChecklist(); }
}

async function _actDeleteChecklist(id) {
  if (!confirm('¿Eliminar este ítem del checklist?')) return;
  try { await apiDeleteChecklistItem(id); _actLoadChecklist(); }
  catch (e) { toast('✕', e.message, 'error'); }
}

/* ─── ADJUNTOS ───────────────────────────────────────────── */

async function _actLoadAdjuntos() {
  const wrap = document.getElementById('act-adj-list');
  try {
    const rows = await apiGetAdjuntos(_actCtx.entidad, _actCtx.id);
    if (!wrap) return;
    wrap.innerHTML = rows.length ? rows.map(function (a) {
      return '<figure class="adj-card">' +
        '<a href="' + escapeHtml(a.url) + '" target="_blank" rel="noopener">' +
        '<img src="' + escapeHtml(a.thumbnail_url || a.url) + '" alt="' + escapeHtml(a.nombre_archivo) + '" loading="lazy" /></a>' +
        '<figcaption title="' + escapeHtml(a.nombre_archivo) + '">' + escapeHtml(a.nombre_archivo) + '</figcaption>' +
        '<button class="danger sm admin-only adj-del" onclick="_actDeleteAdjunto(' + a.id + ')">Eliminar</button>' +
        '</figure>';
    }).join('') : '<div class="text-muted" style="font-size:13px">Sin adjuntos.</div>';
    if (typeof restrictWriteIfAgent === 'function') restrictWriteIfAgent();
  } catch (e) { if (wrap) wrap.innerHTML = '<div class="status-bar error">' + escapeHtml(e.message) + '</div>'; }
}

async function _actUpload(e) {
  const files = e.target.files;
  if (!files || !files.length) return;
  const st = document.getElementById('act-upstatus');
  let done = 0;
  for (let i = 0; i < files.length; i++) {
    if (st) st.textContent = 'Subiendo ' + (i + 1) + '/' + files.length + '…';
    try {
      const payload = await _fileToUpload(files[i], 1600, 0.85);
      payload.entidad = _actCtx.entidad;
      payload.id_entidad = _actCtx.id;
      await apiCreateAdjunto(payload);
      done++;
    } catch (err) { toast('✕', (files[i].name || 'archivo') + ': ' + err.message, 'error'); }
  }
  if (st) st.textContent = '';
  e.target.value = '';
  if (done) { toast('✓', done + ' adjunto(s) subido(s)', 'success'); _actLoadAdjuntos(); }
}

async function _actDeleteAdjunto(id) {
  if (!confirm('¿Eliminar este adjunto? Se borra el archivo de Drive.')) return;
  try { await apiDeleteAdjunto(id); toast('✓', 'Adjunto eliminado', 'success'); _actLoadAdjuntos(); }
  catch (e) { toast('✕', e.message, 'error'); }
}

// Redimensiona imágenes en el navegador y devuelve { nombre_archivo, mime, data_base64 }.
function _fileToUpload(file, maxDim, quality) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error('No se pudo leer el archivo')); };
    if (!/^image\//.test(file.type)) {
      reader.onload = function () { resolve({ nombre_archivo: file.name, mime: file.type || 'application/octet-stream', data_base64: String(reader.result).split(',')[1] }); };
      reader.readAsDataURL(file);
      return;
    }
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error('Imagen inválida')); };
      img.onload = function () {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const out = c.toDataURL('image/jpeg', quality);
        resolve({ nombre_archivo: file.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data_base64: out.split(',')[1] });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function _actWhen(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
