# CLAUDE.md — Project Control Center

Instrucciones para Claude Code / Codex en este proyecto. Hereda las reglas
compartidas de `../CLAUDE.md` y los documentos maestros de `Documentación/IA/`
(`style_guide.md`, `apps_script_standards.md`, `google_sheets_standards.md`,
`ai_rules.md`). Esto NO los reemplaza, los especializa.

## Qué es

Sistema interno de gestión y seguimiento de proyectos (reemplazo de Jira para el
flujo propio). Stack canónico del ecosistema: Vanilla JS + Apps Script + Sheets +
Drive (adjuntos) + GitHub Pages.

## Stack y arquitectura

- Frontend HTML/CSS/Vanilla JS, sin frameworks ni dependencias externas.
- Backend GAS: un `doPost` + router en `Code.gs`; `doGet` solo health.
- Respuesta siempre `{ ok:true, data }` / `{ ok:false, error, code }`.
- Base de datos en Google Sheets — ver `docs/db_structure.md` (mapa de columnas en
  `apps-script/Config.gs`, es el contrato Sheet↔código).
- Adjuntos en Google Drive (Sprint 3).

## Patrones de seguridad

- Contraseña: `SHA256(plainPassword)` en el frontend **antes** de enviar; el backend
  guarda `SHA256(salt + password_hash)`.
- Sesión en `localStorage` (`pcc_session`) con TTL 8h; sesiones server-side en hoja
  `SESIONES`; `validateSessionToken_` revalida rol/estado en cada request.
- Roles: `1 = Admin` (escribe), `2 = Agente` (solo lectura). Escrituras pasan por
  `requireAdmin_` en el router; en el frontend, elementos `.admin-only`.
- `escapeHtml()` en todo dato externo antes de `innerHTML`.
- Credenciales/IDs (SPREADSHEET_ID, Web App URL) nunca en el repo: Script Properties
  / localStorage.

## Convenciones locales

- `action` (no `accion`) como clave de operación en el body POST.
- Handlers de dominio: `verbo + Entidad_` con sufijo `_` (ej. `createProyecto_`).
  Helpers genéricos también con `_`. Solo `doGet/doPost/setup*/seed*/_test*` son públicas.
- Soft delete siempre: estado `Cancelado`/`Cancelada`, nunca borrar filas.
- Todo `update*`/`delete*` registra en `HISTORIAL` (campo a campo) y `LOGS`.
- Sin `fetch()` directo en módulos: usar los helpers de `api.js`.

## Versionado obligatorio

Actualizar `config.js` → `VERSION` (y su nota) **antes del commit** de cada cambio funcional.

| Tipo de cambio | Bump |
|----------------|------|
| Nuevo módulo o feature visible | Minor (1.1.0 → 1.2.0) |
| Bug fix, mejora UX, estilo | Patch (1.1.0 → 1.1.1) |
| Cambio de arquitectura / breaking | Major (1.x → 2.0.0) |
| Docs, comentarios, README | Sin bump |

## Reglas de trabajo

- No hacer push sin confirmación explícita.
- No reescribir layout, estilos ni auth sin consultar.
- En refactors o cambios con riesgo, validar por etapas antes de continuar.
- Verificar visualmente con el preview antes de reportar una tarea como completa.
