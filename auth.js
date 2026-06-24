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

// Deshabilita/oculta los controles de escritura para Agentes.
function restrictWriteIfAgent() {
  if (isAdmin()) { document.body.classList.remove('no-edit'); return; }
  document.body.classList.add('no-edit');
  document.querySelectorAll('.admin-only').forEach(function (el) {
    el.disabled = true;
    el.classList.add('agent-disabled');
    el.title = 'Solo administradores pueden ejecutar esta acción';
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
function renderSidebarUser() {
  const footer = document.getElementById('sidebarFooter');
  if (!footer || document.getElementById('sidebar-user-info')) return;
  const u = SESSION.usuario;
  if (!u) return;
  const isAdmin = Number(u.id_rol) === 1;
  const roleLabel = isAdmin ? 'Admin' : 'Agente';
  const roleCls   = isAdmin ? 'auth-role-admin' : 'auth-role-agente';
  const info = document.createElement('div');
  info.id = 'sidebar-user-info';
  info.style.cssText = 'padding:6px 0 8px;border-top:1px solid var(--border);margin-bottom:4px';
  info.innerHTML =
    '<div style="font-size:11px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px">'
    + escapeHtml(u.nombre || u.email) + '</div>'
    + '<div style="padding:3px 4px 6px">'
    + '<span class="auth-chip-role ' + roleCls + '" style="font-size:10px">' + roleLabel + '</span></div>'
    + '<div class="nav-item" onclick="showChangePasswordModal()" style="cursor:pointer;font-size:12px">'
    + '<span class="nav-icon" style="font-size:13px">⊙</span> Cambiar contraseña</div>'
    + '<div class="nav-item" onclick="authLogout()" style="cursor:pointer;font-size:12px">'
    + '<span class="nav-icon" style="font-size:13px">↩</span> Cerrar sesión</div>';
  footer.insertBefore(info, footer.firstChild);
}

/* ─── USER CHIP (topbar) ─────────────────────────────────── */
function renderUserChip() {
  const slot = document.getElementById('userChip');
  if (!slot) return;
  if (CFG.isMock()) {
    slot.innerHTML = '<span class="user-chip"><b>Modo demo</b><span class="role">datos locales</span></span>';
    return;
  }
  const u = SESSION.usuario;
  if (!u) return;
  slot.innerHTML =
    '<span class="user-chip"><b>' + escapeHtml(u.nombre || u.email) + '</b>' +
    '<span class="role">' + escapeHtml(u.nombre_rol || '') + '</span></span>' +
    '<button class="btn-icon" title="Cambiar contraseña" onclick="showChangePasswordModal()">⊙</button>' +
    '<button class="btn-icon" title="Cerrar sesión" onclick="authLogout()">↩</button>';
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
