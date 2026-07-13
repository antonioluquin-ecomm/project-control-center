/* ============================================================
   PROJECT CONTROL CENTER — auth.js
   Sesión, guards de acceso y control por rol. Cargar tras config.js.
   Contrato canónico: getSession/setSession, requireAuth, requireAdmin,
   renderUserChip, authLogout, sha256, restrictWriteIfAgent.
   ============================================================ */

/* ─── SHA-256 ────────────────────────────────────────────── */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/* ─── SESSION ────────────────────────────────────────────── */
const SESSION = {
  get data() { try { return JSON.parse(localStorage.getItem('pcc_session') || 'null'); } catch (e) { return null; } },
  set data(v) { localStorage.setItem('pcc_session', JSON.stringify(v)); },
  clear() { localStorage.removeItem('pcc_session'); },
  isLoggedIn() { const d = this.data; return !!d && !!d.expira_en && new Date(d.expira_en) > new Date(); },
  get token() { return (this.data && this.data.session_token) || ''; },
  get usuario() { return (this.data && this.data.usuario) || null; },
  get permisos() { return (this.data && this.data.permisos) || null; },
};

function getSession() { return SESSION.data; }
function setSession(v) { SESSION.data = v; }
function isAdmin() {
  if (CFG.isMock()) return true;                 // demo: acceso total
  return SESSION.isLoggedIn() && Number(SESSION.usuario && SESSION.usuario.id_rol) === 1;
}

/* ─── PERMISOS POR MÓDULO (RBAC) ─────────────────────────── */
// Módulos gobernados por PERMISOS_MODULOS (espejo de MODULOS en Config.gs).
const MODULOS_FRONT = ['proyectos', 'tareas', 'seguimiento', 'reportes', 'gantt'];

// canView/canEdit: el Admin y el modo demo ven/editan todo. Si la sesión no
// trae permisos (sesión vieja, pre-RBAC), no se restringe (default-allow) para
// no romper el acceso hasta el próximo login; la autorización de escritura la
// sigue exigiendo el backend por rol.
function canView(mod) {
  if (CFG.isMock() || isAdmin()) return true;
  if (!SESSION.isLoggedIn()) return false;
  const p = SESSION.permisos;
  if (!p) return true;
  return !p[mod] || p[mod].ver !== false;
}

function canEdit(mod) {
  if (CFG.isMock() || isAdmin()) return true;
  if (!SESSION.isLoggedIn()) return false;
  const p = SESSION.permisos;
  if (!p || !p[mod]) return false;
  return p[mod].editar === true;
}

// Oculta los nav-links de los módulos que el usuario no puede ver.
// El módulo se deriva del segmento de carpeta tras "modules/" en el href.
function applyPermissionsToNav() {
  if (CFG.isMock() || !SESSION.isLoggedIn() || isAdmin()) return;
  document.querySelectorAll('.nav-item[href]').forEach(function (el) {
    const m = (el.getAttribute('href') || '').match(/modules\/([^/]+)\//);
    const mod = m ? m[1] : '';
    if (MODULOS_FRONT.indexOf(mod) !== -1 && !canView(mod)) el.style.display = 'none';
  });
}

// Hook común a todas las páginas (auth.js se carga en todas): ocultar nav
// según permisos. requireAuth() de cada página corre por separado.
document.addEventListener('DOMContentLoaded', applyPermissionsToNav);

/* ─── LOGIN PATH dinámico ────────────────────────────────── */
function _loginPath() {
  const tag = document.querySelector('script[src*="config.js"]');
  if (tag) return tag.getAttribute('src').replace('config.js', '') + 'login.html';
  return 'login.html';
}

/* ─── GUARDS ─────────────────────────────────────────────── */
function requireAuth() {
  if (CFG.isMock()) return;                       // sin API → demo abierto
  if (!SESSION.isLoggedIn()) { window.location.href = _loginPath(); return; }
}

function requireAdmin() {
  // Para páginas exclusivas de admin (no usado en S1; los controles usan .admin-only).
  requireAuth();
  if (!isAdmin()) { window.location.href = _loginPath().replace('login.html', 'index.html'); }
}

// Módulo de la página actual (derivado de la ruta modules/<x>/...).
function _currentModule() {
  const m = (location.pathname || '').match(/modules\/([^/]+)\//);
  return m ? m[1] : '';
}

// Deshabilita los controles de escritura si el rol no puede editar este módulo.
// Admin edita todo; un rol personalizado edita solo los módulos con puede_editar=SI.
// (El backend valida igual cada escritura por módulo — esto es solo UX.)
function restrictWriteIfAgent() {
  const mod = _currentModule();
  const puedeEditar = isAdmin() || (mod && canEdit(mod));
  if (puedeEditar) { document.body.classList.remove('no-edit'); return; }
  document.body.classList.add('no-edit');
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.disabled = true;
    el.classList.add('agent-disabled');
    el.title = 'No tenés permisos de edición en este módulo';
  });
}

/* ─── LOGOUT ─────────────────────────────────────────────── */
function authLogout() {
  const token = SESSION.token;
  SESSION.clear();
  if (token && CFG.apiUrl) {
    fetch(CFG.apiUrl, { method: 'POST', body: JSON.stringify({ action: 'logout', session_token: token }) }).catch(function () {});
  }
  window.location.href = _loginPath();
}

/* ─── SIDEBAR FOOTER (index.html) ───────────────────────── */
// ── Helpers: dropdown de usuario en sidebar (navigation_standard §3) ──
function _openUserDropdown() {
  const drop = document.getElementById('user-dropdown');
  const chip = document.getElementById('sidebar-user-chip');
  if (!drop || !chip) return;
  drop.style.display = 'block';
  if (window.innerWidth <= 900) {
    // Mobile: el sidebar está oculto — panel bottom-center
    drop.style.bottom = '12px';
    drop.style.left   = '12px';
    drop.style.right  = '12px';
    drop.style.width  = 'auto';
  } else {
    const rect = chip.getBoundingClientRect();
    drop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    drop.style.left   = rect.left + 'px';
    drop.style.right  = 'auto';
    drop.style.width  = rect.width + 'px';
  }
  chip.setAttribute('aria-expanded', 'true');
  chip.classList.add('open');
}

function _closeUserDropdown() {
  const drop = document.getElementById('user-dropdown');
  const chip = document.getElementById('sidebar-user-chip');
  if (drop) drop.style.display = 'none';
  if (chip) { chip.setAttribute('aria-expanded', 'false'); chip.classList.remove('open'); }
}

function renderSidebarUser() {
  const footer = document.getElementById('sidebarFooter');
  if (!footer || document.getElementById('sidebar-user-chip')) return;
  const u = SESSION.usuario;
  if (!u) return;
  const isAdm = Number(u.id_rol) === 1;
  const roleLabel = u.nombre_rol || (isAdm ? 'Administrador' : 'Rol ' + u.id_rol);

  // Chip compacto de dos líneas (sin avatar) en el footer
  const chip = document.createElement('div');
  chip.id = 'sidebar-user-chip';
  chip.className = 'user-chip';
  chip.setAttribute('role', 'button');
  chip.setAttribute('aria-haspopup', 'true');
  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('title', u.nombre || u.email || '');
  chip.innerHTML =
    '<div class="user-chip-info">' +
      '<span class="user-chip-name">' + escapeHtml(u.nombre || u.email) +
        ' <span class="user-chip-chevron" aria-hidden="true">▾</span></span>' +
      '<span class="user-chip-role">' + escapeHtml(roleLabel) + '</span>' +
    '</div>';
  chip.addEventListener('click', function (e) {
    e.stopPropagation();
    const drop = document.getElementById('user-dropdown');
    if (drop && drop.style.display !== 'none') _closeUserDropdown();
    else _openUserDropdown();
  });
  footer.appendChild(chip);

  // Dropdown adjunto a <body> para evitar el clipping del overflow del sidebar
  if (!document.getElementById('user-dropdown')) {
    const isDark = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark';
    const drop = document.createElement('div');
    drop.id = 'user-dropdown';
    drop.className = 'user-dropdown';
    drop.setAttribute('role', 'menu');
    drop.style.display = 'none';
    drop.innerHTML =
      '<div class="user-dropdown-header">' +
        '<div class="sidebar-user-name">' + escapeHtml(u.nombre || u.email) + '</div>' +
        '<div class="sidebar-user-email">' + escapeHtml(u.email || '') + '</div>' +
        '<div class="sidebar-user-meta"><span class="auth-chip-role">' + escapeHtml(roleLabel) + '</span></div>' +
      '</div>' +
      '<div class="user-dropdown-sep"></div>' +
      '<button class="user-dropdown-item theme-toggle" type="button" onclick="toggleTheme()">' +
        '<span class="th-icon">' + (isDark ? '☀' : '☾') + '</span>' +
        '<span class="th-label">' + (isDark ? 'Modo claro' : 'Modo oscuro') + '</span>' +
      '</button>' +
      '<div class="user-dropdown-sep"></div>' +
      '<button class="user-dropdown-item" type="button" onclick="showChangePasswordModal()">Cambiar contraseña</button>' +
      '<div class="user-dropdown-sep"></div>' +
      '<button class="user-dropdown-item danger" type="button" onclick="authLogout()">Cerrar sesión</button>';
    drop.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(drop);

    // Cerrar el dropdown al ejecutar cualquier acción
    drop.querySelectorAll('.user-dropdown-item').forEach(function (btn) {
      btn.addEventListener('click', _closeUserDropdown);
    });
  }

  document.addEventListener('click', _closeUserDropdown);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeUserDropdown(); });

  _updateThemeToggles(document.documentElement.getAttribute('data-theme') || 'light');
}

/* ─── CAMBIAR CONTRASEÑA ─────────────────────────────────── */
function showChangePasswordModal() {
  if (document.getElementById('chpw-overlay')) return;
  const ov = document.createElement('div');
  ov.id = 'chpw-overlay'; ov.className = 'modal-overlay';
  ov.innerHTML =
    '<div class="modal" style="max-width:380px">' +
    '<h3>Cambiar contraseña</h3>' +
    '<div id="chpw-err" class="status-bar error" hidden></div>' +
    '<div class="field"><label>Contraseña actual</label><input id="chpw-act" type="password" autocomplete="current-password"></div>' +
    '<div class="field"><label>Nueva contraseña</label><input id="chpw-new" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>' +
    '<div class="field"><label>Confirmar nueva</label><input id="chpw-cnf" type="password" autocomplete="new-password"></div>' +
    '<div class="modal-actions">' +
    '<button class="secondary" onclick="document.getElementById(\'chpw-overlay\').remove()">Cancelar</button>' +
    '<button id="chpw-save" onclick="_submitChangePassword()">Guardar</button>' +
    '</div></div>';
  document.body.appendChild(ov);
}

async function _submitChangePassword() {
  const act = (document.getElementById('chpw-act') || {}).value || '';
  const nue = (document.getElementById('chpw-new') || {}).value || '';
  const cnf = (document.getElementById('chpw-cnf') || {}).value || '';
  const err = document.getElementById('chpw-err');
  const show = function (m) { if (err) { err.textContent = m; err.hidden = false; } };
  if (err) err.hidden = true;
  if (!act) return show('Ingresá tu contraseña actual.');
  if (!nue || nue.length < 6) return show('La nueva debe tener al menos 6 caracteres.');
  if (nue !== cnf) return show('Las contraseñas no coinciden.');

  const btn = document.getElementById('chpw-save');
  if (btn) btn.disabled = true;
  try {
    const res = await fetch(CFG.apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'changePassword', session_token: SESSION.token,
        password_actual_hash: await sha256(act), password_nueva_hash: await sha256(nue),
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Error');
    document.getElementById('chpw-overlay').remove();
    toast('✓', 'Contraseña actualizada', 'success');
  } catch (e) {
    if (btn) btn.disabled = false;
    show(e.message || 'Error al cambiar la contraseña.');
  }
}

/* ─── NOTIFICACIONES (campana del top header) ─────────────────
   Se inyecta por JS en todas las páginas con topbar (el topbar está
   duplicado en cada HTML). Patrón de panel flotante = user-dropdown. */

let _notifTimer = null;

const _NOTIF_ICON = { ASIGNACION: '📌', ESTADO: '🔄', COMENTARIO: '💬', MENCION: '@' };

function initNotificaciones() {
  // En modo real, solo para sesiones activas; en demo siempre se muestra.
  if (!CFG.isMock() && !SESSION.isLoggedIn()) return;
  const actions = document.querySelector('.topbar .topbar-actions') || document.querySelector('.topbar');
  if (!actions || document.getElementById('notif-bell')) return;

  const btn = document.createElement('button');
  btn.id = 'notif-bell';
  btn.className = 'notif-bell';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Notificaciones');
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="notif-bell-icon" aria-hidden="true">🔔</span>' +
                  '<span class="notif-badge" id="notif-badge" hidden>0</span>';
  actions.insertBefore(btn, actions.firstChild);

  // Panel adjunto a <body> para evitar clipping del overflow del topbar.
  const panel = document.createElement('div');
  panel.id = 'notif-panel';
  panel.className = 'notif-panel';
  panel.setAttribute('role', 'menu');
  panel.style.display = 'none';
  panel.innerHTML =
    '<div class="notif-panel-head">' +
      '<span>Notificaciones</span>' +
      '<button type="button" class="notif-mark-all" id="notif-mark-all">Marcar todas como leídas</button>' +
    '</div>' +
    '<div class="notif-list" id="notif-list"><div class="notif-empty">Cargando…</div></div>';
  document.body.appendChild(panel);
  panel.addEventListener('click', function (e) { e.stopPropagation(); });

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.style.display !== 'none') _closeNotifPanel();
    else _openNotifPanel();
  });
  document.getElementById('notif-mark-all').addEventListener('click', _notifMarkAll);
  // Delegación: click en un ítem → marcar leída y navegar.
  document.getElementById('notif-list').addEventListener('click', function (e) {
    const item = e.target.closest('.notif-item');
    if (item) _notifOpen(item.dataset.id, item.dataset.entidad, item.dataset.identidad);
  });
  document.addEventListener('click', _closeNotifPanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeNotifPanel(); });

  refreshNotifCount();
  if (!_notifTimer) _notifTimer = setInterval(refreshNotifCount, 60000);
}

function _openNotifPanel() {
  const btn = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');
  if (!btn || !panel) return;
  panel.style.display = 'block';
  const rect = btn.getBoundingClientRect();
  if (window.innerWidth <= 640) {
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.left = '8px'; panel.style.right = '8px'; panel.style.width = 'auto';
  } else {
    panel.style.top = (rect.bottom + 6) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    panel.style.left = 'auto'; panel.style.width = '340px';
  }
  btn.setAttribute('aria-expanded', 'true');
  _loadNotifList();
}

function _closeNotifPanel() {
  const panel = document.getElementById('notif-panel');
  const btn = document.getElementById('notif-bell');
  if (panel) panel.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function _setNotifBadge(n) {
  const b = document.getElementById('notif-badge');
  if (!b) return;
  if (n > 0) { b.textContent = n > 99 ? '99+' : String(n); b.hidden = false; }
  else b.hidden = true;
}

async function refreshNotifCount() {
  try {
    const res = await apiGetNotificaciones();
    _setNotifBadge(res && res.no_leidas ? Number(res.no_leidas) : 0);
  } catch (e) { /* silencioso: no romper la página por notificaciones */ }
}

async function _loadNotifList() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  try {
    const res = await apiGetNotificaciones();
    const items = (res && res.items) || [];
    _setNotifBadge(res && res.no_leidas ? Number(res.no_leidas) : 0);
    list.innerHTML = items.length ? items.map(function (n) {
      const icon = _NOTIF_ICON[n.tipo] || '•';
      const noLeida = String(n.leida) !== 'SI';
      return '<button type="button" class="notif-item' + (noLeida ? ' unread' : '') + '"' +
        ' data-id="' + escapeHtml(n.id) + '"' +
        ' data-entidad="' + escapeHtml(n.entidad) + '"' +
        ' data-identidad="' + escapeHtml(n.id_entidad) + '">' +
        '<span class="notif-item-icon" aria-hidden="true">' + escapeHtml(icon) + '</span>' +
        '<span class="notif-item-body">' +
          '<span class="notif-item-msg">' + escapeHtml(n.mensaje) + '</span>' +
          '<span class="notif-item-when">' + escapeHtml(_notifWhen(n.timestamp)) + '</span>' +
        '</span>' +
      '</button>';
    }).join('') : '<div class="notif-empty">No tenés notificaciones.</div>';
  } catch (e) {
    list.innerHTML = '<div class="notif-empty">No se pudieron cargar las notificaciones.</div>';
  }
}

async function _notifMarkAll(e) {
  if (e) e.stopPropagation();
  try {
    await apiMarkAllNotificacionesLeidas();
    _setNotifBadge(0);
    _loadNotifList();
  } catch (err) { /* silencioso */ }
}

async function _notifOpen(id, entidad, idEntidad) {
  try { await apiMarkNotificacionLeida(id); } catch (e) { /* seguir aunque falle */ }
  const base = (typeof _assetBase === 'function') ? _assetBase() : '';
  const href = entidad === 'PROYECTO'
    ? base + 'modules/proyectos/proyectos.html?actividad=' + encodeURIComponent(idEntidad)
    : base + 'modules/tareas/tareas.html?tarea=' + encodeURIComponent(idEntidad);
  window.location.href = href;
}

// Fecha relativa liviana (no depende de actividad.js, que no se carga en index).
function _notifWhen(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return 'hace ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return 'hace ' + h + ' h';
  return d.toLocaleDateString('es-AR');
}

/* ─── MENCIONES @usuario en el editor de comentarios ──────────
   Delegación sobre #act-input (el textarea del panel de actividad, creado
   dinámicamente). Al escribir "@" muestra un selector de usuarios activos;
   al elegir, inserta "@Nombre ". El backend matchea "@Nombre" contra el
   nombre completo del usuario. */

let _mentionStart = -1;   // posición del "@" que dispara el selector
let _mentionSel = 0;      // índice resaltado

document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'act-input') _mentionOnInput(e.target);
});
document.addEventListener('keydown', function (e) {
  if (e.target && e.target.id === 'act-input') _mentionOnKeydown(e);
}, true);

function _mentionMatches(token) {
  const t = normalizeText(token);
  return (_usuariosBasico || [])
    .map(function (u) { return u.nombre; })
    .filter(Boolean)
    .filter(function (n) { return normalizeText(n).indexOf(t) !== -1; })
    .slice(0, 6);
}

function _mentionOnInput(ta) {
  if (!_usuariosBasico) { loadUsuariosBasico().then(function () { _mentionOnInput(ta); }); return; }
  const val = ta.value;
  const caret = ta.selectionStart;
  const upto = val.slice(0, caret);
  const at = upto.lastIndexOf('@');
  // El token va desde el '@' hasta el caret; se corta si hay espacio/salto.
  if (at === -1 || /[\s]/.test(upto.slice(at + 1))) { _mentionClose(); return; }
  const token = upto.slice(at + 1);
  const matches = _mentionMatches(token);
  if (!matches.length) { _mentionClose(); return; }
  _mentionStart = at;
  _mentionSel = 0;
  _mentionRender(ta, matches);
}

function _mentionRender(ta, matches) {
  let pop = document.getElementById('mention-pop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'mention-pop';
    pop.className = 'mention-pop';
    document.body.appendChild(pop);
    pop.addEventListener('mousedown', function (e) {
      // mousedown (no click) para no perder el foco/caret del textarea antes de insertar.
      const it = e.target.closest('.mention-item');
      if (it) { e.preventDefault(); _mentionPick(ta, it.dataset.nombre); }
    });
  }
  pop.innerHTML = matches.map(function (n, i) {
    return '<div class="mention-item' + (i === _mentionSel ? ' active' : '') + '" data-nombre="' + escapeHtml(n) + '">' + escapeHtml(n) + '</div>';
  }).join('');
  pop.dataset.count = matches.length;
  const rect = ta.getBoundingClientRect();
  pop.style.display = 'block';
  pop.style.left = rect.left + 'px';
  pop.style.top = (rect.bottom + 4) + 'px';
  pop.style.minWidth = Math.min(rect.width, 260) + 'px';
}

function _mentionClose() {
  const pop = document.getElementById('mention-pop');
  if (pop) pop.style.display = 'none';
  _mentionStart = -1;
}

function _mentionPick(ta, nombre) {
  if (_mentionStart < 0) return;
  const caret = ta.selectionStart;
  const val = ta.value;
  const before = val.slice(0, _mentionStart);
  const after = val.slice(caret);
  const insert = '@' + nombre + ' ';
  ta.value = before + insert + after;
  const pos = before.length + insert.length;
  ta.setSelectionRange(pos, pos);
  ta.focus();
  _mentionClose();
}

function _mentionOnKeydown(e) {
  const pop = document.getElementById('mention-pop');
  if (!pop || pop.style.display === 'none') return;
  const count = Number(pop.dataset.count || 0);
  if (!count) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _mentionSel = (_mentionSel + 1) % count; _mentionHighlight(pop); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _mentionSel = (_mentionSel - 1 + count) % count; _mentionHighlight(pop); }
  else if (e.key === 'Enter' || e.key === 'Tab') {
    const it = pop.querySelectorAll('.mention-item')[_mentionSel];
    if (it) { e.preventDefault(); _mentionPick(e.target, it.dataset.nombre); }
  } else if (e.key === 'Escape') { e.preventDefault(); _mentionClose(); }
}

function _mentionHighlight(pop) {
  pop.querySelectorAll('.mention-item').forEach(function (el, i) {
    el.classList.toggle('active', i === _mentionSel);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  try { initNotificaciones(); } catch (e) { /* no romper la página */ }
});

function initSidebarCollapse() {
  const btn = document.getElementById('sidebarCollapseBtn');
  if (!btn) return;
  const _sync = () => {
    const collapsed = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
    btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    btn.setAttribute('title', collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral');
  };
  btn.addEventListener('click', () => {
    const collapsed = document.documentElement.getAttribute('data-sidebar') === 'collapsed';
    if (collapsed) {
      document.documentElement.removeAttribute('data-sidebar');
      localStorage.removeItem('pcc_sidebar');
    } else {
      document.documentElement.setAttribute('data-sidebar', 'collapsed');
      localStorage.setItem('pcc_sidebar', 'collapsed');
    }
    _sync();
  });
  _sync();
}
