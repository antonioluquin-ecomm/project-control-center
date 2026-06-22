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
      '<button class="act-tab" id="act-tab-adj" onclick="_actShow(\'adj\')">Adjuntos</button>' +
      '<button class="act-tab" id="act-tab-his" onclick="_actShow(\'his\')">Historial</button>' +
    '</div>' +
    '<div id="act-com">' +
      '<div class="field" style="margin-top:12px"><textarea id="act-input" placeholder="Escribí un comentario…"></textarea></div>' +
      '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button id="act-send" class="sm" onclick="_actSend()">Comentar</button></div>' +
      '<div id="act-com-list"><div class="text-muted" style="font-size:13px">Cargando…</div></div>' +
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
  _actLoadAdjuntos();
  _actLoadHistorial();
  const fi = document.getElementById('act-file');
  if (fi) fi.addEventListener('change', _actUpload);
}

function closeActividad() { document.getElementById('modals').innerHTML = ''; }

function _actShow(which) {
  ['com', 'adj', 'his'].forEach(function (k) {
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
    wrap.innerHTML = rows.length ? rows.map(function (c) {
      return '<div class="act-item">' +
        '<div class="act-meta"><b>' + escapeHtml(c.usuario || '—') + '</b><span>' + _actWhen(c.fecha_creacion) + '</span></div>' +
        '<div class="act-text">' + escapeHtml(c.texto) + '</div></div>';
    }).join('') : '<div class="text-muted" style="font-size:13px">Sin comentarios todavía.</div>';
  } catch (e) { if (wrap) wrap.innerHTML = '<div class="status-bar error">' + escapeHtml(e.message) + '</div>'; }
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
