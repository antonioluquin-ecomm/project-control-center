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
| C | descripcion | texto | máx. 4000 |
| D | estado | lista | CAT_ESTADOS_PROYECTO |
| E | prioridad | lista | CAT_PRIORIDADES |
| F | responsable | texto | |
| G | sitio | lista | CAT_SITIOS (opcional) |
| H | fecha_inicio | fecha | |
| I | fecha_fin_estimada | fecha | |
| J | observaciones | texto | máx. 4000 |
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
| D | descripcion | texto | máx. 4000 |
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
| W | id_sprint | entero | FK → SPRINTS.id (nullable; '' = sin sprint) *(sprints)* |
| X | url_informe_gestion | URL | informe de gestion del portal ecommerce; obligatorio para pasar de Documentacion a Revision si la tarea paso por Documentacion |
| Y | seccion | lista (CSV) | CAT_SECCIONES (PLP/PDP/Home/etc.), multi-valor separado por coma *(dimensión reutilizable)* |
| Z | dispositivos | lista (CSV) | DISPOSITIVOS (Mobile/Tablet/Desktop), multi-valor separado por coma *(dimensión reutilizable)* |
| AA | informe_version | texto | máx. 60 *(Informe de Gestion)* |
| AB | informe_fecha_implementacion | fecha | *(Informe de Gestion)* |
| AC | informe_descripcion_general | texto | máx. 4000 *(Informe de Gestion)* |
| AD | informe_detalles_tecnicos | texto | máx. 4000 *(Informe de Gestion)* |
| AE | informe_resultado | texto | máx. 4000 *(Informe de Gestion)* |
| AF | requerimiento_texto | texto | máx. 4000 *(Requerimiento — brief Jira/GitLab)* |
| AG | requerimiento_detalles | texto | máx. 4000 *(Requerimiento)* |
| AH | requerimiento_objetivo | texto | máx. 4000 *(Requerimiento)* |

`vencida` se calcula al servir (estado no cerrado + `fecha_limite < hoy`).

**Sección / Dispositivos (cols Y, Z):** dimensiones a nivel tarea, igual que
área/tienda — se completan desde el form de edición (multi-selección), no solo
desde un tab. Sirven de dato reusable para el Informe de Gestión, el Requerimiento
y a futuro para filtros/reportes. `CAT_SECCIONES` no tiene UI de administración
todavía (igual que `CAT_TIENDAS`): para ampliar la lista, editar la hoja
directamente.

**Informe de Gestión (tab del modal de detalle de tarea):** estructura guiada para
centralizar la info que hoy se intercambia manualmente entre el PM y quien publica
en el Portal eComm. Autocompletado desde la propia tarea (no se duplica en
columnas): título, proyecto, área, responsable, tienda, sección, dispositivos,
estado, fecha_creacion. Los campos AA–AE son los editables manualmente dentro del
tab. La "imagen o video ilustrativo" no tiene columna propia: reutiliza ADJUNTOS
(entidad=TAREA) — el tab simplemente lista los adjuntos existentes de la tarea.
`url_informe_gestion` (col X) no cambia de rol: sigue siendo el link a la página
ya publicada; los campos del Informe de Gestión son el borrador estructurado que
alimenta esa publicación.

**Requerimiento (tab del modal de detalle de tarea):** estructura guiada para
armar el brief que se copia al crear el ticket en Jira (InfraCommerce) o GitLab
(PIM), con formato Título/Proyecto/Tienda/Sección/Dispositivos/Requerimiento/
Detalles/Objetivo. Comparte los mismos autocompletados que el Informe de Gestión
(título, proyecto, tienda, sección, dispositivos) pero su contenido narrativo
(cols AF–AH) es independiente: se completa ANTES de trabajar la tarea (brief),
mientras que el Informe de Gestión se completa AL FINALIZAR (cierre/publicación).
Se destaca automáticamente cuando `area` es `InfraCommerce` o `PIM`.

### SPRINTS *(sprints — globales, multi-proyecto)*

| Col | Campo | Tipo | Notas |
|-----|-------|------|-------|
| A | id | entero | |
| B | nombre | texto | máx. 200 |
| C | objetivo | texto | meta del sprint, máx. 500 |
| D | estado | lista | CAT_ESTADOS_SPRINT (Planificado/Activo/Cerrado/Cancelado) |
| E | fecha_inicio | fecha | |
| F | fecha_fin | fecha | |
| G–J | fecha_creacion · fecha_modificacion · creado_por · modificado_por | auditoría | |

Globales: agrupan TAREAS de cualquier proyecto vía `TAREAS.id_sprint`. Soft delete (estado = Cancelado).

**Comportamiento de sprint cancelado:** al cancelar un sprint, `TAREAS.id_sprint` en las filas afectadas **no se limpia** — el dato queda en el Sheet pero el frontend excluye sprints cancelados de `STATE.sprints`, por lo que esas tareas quedan sin chip y sin filtro visible. Esto es por diseño (soft delete: nunca se borran datos). Si se necesita reasignar tareas en lote, hacerlo manualmente desde el form de cada tarea.

**Filtro server-side por sprint (v1.12.0):** `getTareas_` soporta `params.id_sprint`: un id puntual filtra por ese sprint; el valor literal `'backlog'` filtra tareas con `id_sprint` vacío (sin sprint asignado). Esto reemplazó el filtrado 100% cliente — antes `getTareas_` traía siempre toda la hoja TAREAS del proyecto y el sprint se filtraba sobre `STATE.tareas` en el browser.

**Tabs Sprint/Backlog (`tareas.html`, v1.12.0):** la página tiene dos vistas (`_view = 'sprint' | 'backlog'`) en vez de cargar todo de una. El tab **Sprint** (default) precarga el sprint con `estado = 'Activo'`; si no hay ninguno activo, usa el `Planificado` con `fecha_inicio` más próxima (`_defaultSprintId()`); el `<select>` de sprint sigue permitiendo elegir "Todos los sprints" (carga completa, explícita). El tab **Backlog** oculta el selector de sprint y pide `id_sprint: 'backlog'`. El botón "Exportar todo" ignora el tab activo y exporta todas las tareas del proyecto vía `apiGetTareas({id_proyecto})` sin `id_sprint`.

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

## Catálogos (filas de `CONFIG`)

Cada catálogo es una fila de la hoja `CONFIG` (`clave` = nombre del catalogo,
`valor` = CSV de sus valores), no una hoja dedicada — antes cada uno tenía su
propia hoja `CAT_*`, se consolidaron para no llenar el Sheet de pestañas que
en la práctica nadie editaba a mano. Lectura/escritura vía `getCatValues_` /
`setCatValues_` (Helpers.gs); editable desde Configuración > Catálogos en la
app. Instalaciones viejas con hojas `CAT_*` sueltas: correr
`migrarCatalogosAConfig()` una vez (no borra las hojas viejas).

| Clave (CONFIG) | Valores semilla | Editable en la UI |
|------|-----------------|--------------------|
| CAT_ESTADOS_PROYECTO | Por Hacer · En Análisis · En Curso · Bloqueado · Finalizado · Cancelado | Sí |
| CAT_ESTADOS_TAREA | Por Hacer · En Análisis · En Curso · Bloqueada · Finalizada · Cancelada | Sí |
| CAT_ESTADOS_SPRINT | Planificado · Activo · Cerrado · Cancelado | Sí |
| CAT_TIPOS_TAREA | Historia · Tarea · Error · ~~Subtarea~~ *(legacy S8: no se ofrece, reemplazada por CHECKLIST)* | Sí |
| CAT_PRIORIDADES | Highest · High · Medium · Low · Lowest | Sí |
| CAT_SITIOS | Sporting · Woker · PIM · B2B · Todos | Sí |
| CAT_AREAS | Ecom · InfraCommerce · PIM | Sí |
| CAT_TIENDAS | Sporting · Woker · B2B | Sí |
| CAT_SECCIONES | PLP · PDP · Home · Checkout · Carrito · Cuenta · Buscador · Otro | Sí |
| CAT_RESPONSABLES | *(vacío; nombres externos que no son usuarios del sistema)* | Sí |

Estados y tipos tomados del vocabulario real del export de Jira.

Los formularios (Tareas/Proyectos/Gantt) piden estos catálogos al servidor al
cargar (`loadCatalogos()` + helper `cat(key, fallback)` en `api.js`) en vez de
usar las constantes de JS directamente — editar un catálogo desde
Configuración se refleja en los desplegables sin redeploy.

---

## Hojas de sistema

- **USUARIOS** — `id · nombre · email · password_hash · salt · id_rol · activo · fecha_creacion · ultimo_acceso · creado_por`. Password = `SHA256(salt + SHA256(plainPassword))`.
- **SESIONES** — `session_token · id_usuario · email · id_rol · expira_en · creada_en · activa`. TTL 8h.
- **ROLES** — `id · nombre` → `1 = Admin` (escribe), `2 = Agente` (solo lectura).
- **LOGS** — `id · timestamp · accion · entidad · entidad_id · usuario · resultado · detalle`.
- **ERRORS** — `id · timestamp · accion · usuario · mensaje · stack`.
- **CONFIG** — `clave · valor · descripcion`. Config general + catálogos (ver arriba).

---

## Relaciones

- `TAREAS.id_proyecto → PROYECTOS.id` (validada en `createTarea_`).
- `TAREAS.id_sprint → SPRINTS.id` (opcional; sprints globales agrupan tareas de cualquier proyecto). FK validada en `createTarea_` — se rechaza un `id_sprint` inexistente (404). No se valida en `updateTarea_` contra el estado del sprint (se puede asignar a un sprint Cerrado).
- `COMENTARIOS / ADJUNTOS / HISTORIAL` → polimórficas por `(entidad, id_entidad)`.
- Catálogos por valor-string, validados en GAS contra los dominios de `Config.gs`.

---

## Validaciones de datos en el Sheet

Al consolidar los catálogos en filas de `CONFIG` (columna B, un catalogo por
fila) se perdió la referencia simple `=CAT_AREAS!A:A` para `Datos > Validación
de datos` — ya no hay una columna por catalogo. La validación server-side
(GAS, contra `getCatCached_`) sigue siendo la que manda; para alguien que
edite `TAREAS`/`PROYECTOS` directo en el Sheet sin pasar por la app, hoy no
hay dropdown nativo de ayuda para estas columnas (era el costo aceptado al
consolidar — ver discusión de arquitectura de catálogos).
