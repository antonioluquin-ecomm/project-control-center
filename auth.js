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
        '<span class="nav-icon th-icon" style="font-size:13px">' + (isDark ? '🌙' : '☀️') + '</span>' +
        '<span class="th-text">' + (isDark ? 'Oscuro' : 'Claro') + '</span>' +
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
