# Project Control Center — Estructura de Base de Datos

**Versión:** 1.0 · **Backend:** Google Apps Script + Google Sheets

Archivo del Sheet: **`Project Control Center — Base de Datos`**

Reglas (google_sheets_standards): `id` autoincremental en col A · columnas de auditoría al final · booleanos `SI/NO` · soft-delete (estado `Cancelado`/`Cancelada`, nunca borrado físico) · agregar columnas **solo al final** (el orden es el contrato con `*_COLS` en `Config.gs`).

---

## Hojas de datos

### PROYECTOS — fuente de verdad de proyectos

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | id | entero | autoincremental |
| B | nombre | texto | máx. 200 |
| C | descripcion | texto | máx. 2000 |
| D | estado | lista | CAT_ESTADOS_PROYECTO |
| E | prioridad | lista | CAT_PRIORIDADES |
| F | responsable | texto | |
| G | sitio | lista | CAT_SITIOS (opcional) |
| H | fecha_inicio | fecha | |
| I | fecha_fin_estimada | fecha | |
| J | observaciones | texto | |
| K | fecha_creacion | fecha-hora | Apps Script |
| L | fecha_modificacion | fecha-hora | Apps Script |
| M | creado_por | email | Apps Script |
| N | modificado_por | email | Apps Script |

`avance_pct` y `vencido` **no se almacenan** — se calculan al servir (avance = % tareas Finalizadas sobre tareas no canceladas).

### TAREAS — tareas asociadas a un proyecto

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | id | entero | |
| B | id_proyecto | entero | FK → PROYECTOS.id |
| C | titulo | texto | máx. 200 |
| D | descripcion | texto | |
| E | tipo | lista | CAT_TIPOS_TAREA |
| F | estado | lista | CAT_ESTADOS_TAREA |
| G | prioridad | lista | CAT_PRIORIDADES |
| H | responsable | texto | |
| I | fecha_inicio | fecha | |
| J | fecha_limite | fecha | |
| K | avance_pct | entero 0–100 | |
| L | orden | entero | orden de visualización |
| M–P | fecha_creacion · fecha_modificacion · creado_por · modificado_por | auditoría | |
| Q | area | lista | CAT_AREAS (Ecom/InfraCommerce/PIM). Equipo que ejecuta ≠ responsable *(S6)* |
| R | tienda | lista | CAT_TIENDAS (Sporting/Woker/B2B) *(S6)* |
| S | url_jira | URL | enlace Jira Infracommerce (cuando area = InfraCommerce) *(S6)* |
| T | url_gitlab | URL | enlace GitLab PIM (cuando area = PIM) *(S6)* |
| U | url_figma_prototipo | URL | prototipo Figma (maquetación) *(S6)* |
| V | url_figma_editable | URL | editable Figma (maquetación) *(S6)* |

`vencida` se calcula al servir (estado no cerrado + `fecha_limite < hoy`).

### COMENTARIOS *(usada desde Sprint 2)*
`id · entidad (PROYECTO|TAREA) · id_entidad · texto · usuario · fecha_creacion`

### ADJUNTOS *(usada desde Sprint 3 — Google Drive)*
`id · entidad · id_entidad · nombre_archivo · file_id · url · thumbnail_url · mime · tamano · subido_por · fecha_creacion`

### CHECKLIST *(usada desde Sprint 8 — reemplaza subtareas)*
`id · entidad (PROYECTO|TAREA) · id_entidad · texto · hecho (SI|NO) · orden · fecha_creacion · creado_por`
Polimórfica como COMENTARIOS. Borrado físico (ítems efímeros, no auditados).

### HISTORIAL (AUDIT_LOG) — historial de cambios campo a campo
`id · timestamp · entidad · id_entidad · campo · valor_anterior · valor_nuevo · usuario`
Lo escribe el backend en cada `update*`/`delete*` (ya activo en Sprint 1).

---

## Hojas de catálogo (`CAT_`)

| Hoja | Valores semilla |
|------|-----------------|
| CAT_ESTADOS_PROYECTO | Por Hacer · En Análisis · En Curso · Bloqueado · Finalizado · Cancelado |
| CAT_ESTADOS_TAREA | Por Hacer · En Análisis · En Curso · Bloqueada · Finalizada · Cancelada |
| CAT_TIPOS_TAREA | Historia · Tarea · Error · ~~Subtarea~~ *(legacy S8: no se ofrece, reemplazada por CHECKLIST)* |
| CAT_PRIORIDADES | Highest · High · Medium · Low · Lowest |
| CAT_SITIOS | Sporting · Woker · PIM · B2B · Todos |
| CAT_RESPONSABLES | *(se completa desde la UI / migración)* |

Estados y tipos tomados del vocabulario real del export de Jira.

---

## Hojas de sistema

- **USUARIOS** — `id · nombre · email · password_hash · salt · id_rol · activo · fecha_creacion · ultimo_acceso · creado_por`. Password = `SHA256(salt + SHA256(plainPassword))`.
- **SESIONES** — `session_token · id_usuario · email · id_rol · expira_en · creada_en · activa`. TTL 8h.
- **ROLES** — `id · nombre` → `1 = Admin` (escribe), `2 = Agente` (solo lectura).
- **LOGS** — `id · timestamp · accion · entidad · entidad_id · usuario · resultado · detalle`.
- **ERRORS** — `id · timestamp · accion · usuario · mensaje · stack`.
- **CONFIG** — `clave · valor · descripcion`.

---

## Relaciones

- `TAREAS.id_proyecto → PROYECTOS.id` (validada en `createTarea_`).
- `COMENTARIOS / ADJUNTOS / HISTORIAL` → polimórficas por `(entidad, id_entidad)`.
- Catálogos por valor-string, validados en GAS contra los dominios de `Config.gs`.

---

## Validaciones de datos en el Sheet (opcional pero recomendado)

`Datos > Validación de datos`:

| Columna | Hoja | Fuente |
|---------|------|--------|
| estado | PROYECTOS | `=CAT_ESTADOS_PROYECTO!A:A` |
| prioridad | PROYECTOS/TAREAS | `=CAT_PRIORIDADES!A:A` |
| estado | TAREAS | `=CAT_ESTADOS_TAREA!A:A` |
| tipo | TAREAS | `=CAT_TIPOS_TAREA!A:A` |
| sitio | PROYECTOS | `=CAT_SITIOS!A:A` |
| area | TAREAS | `=CAT_AREAS!A:A` |
| tienda | TAREAS | `=CAT_TIENDAS!A:A` |
