/* ============================================================
   PROJECT CONTROL CENTER — config.js
   Configuración global, constantes, estado y theme.
   Cargar primero, antes de auth.js y api.js.
   ============================================================ */

'use strict';

/* ─── VERSIÓN ─────────────────────────────────────────────── */

const VERSION = {
  number: '1.26.5',
  date:   '2026-07-20',
  notes:  'Edicion de comentarios propios limitada a 15 minutos',
};

const CHANGELOG = [
  { v: '1.26.5', date: '2026-07-20', desc: 'Comentarios: se corrige la deteccion del autor (el email vive en SESSION.usuario), por lo que Editar vuelve a aparecer cuando corresponde. La edicion queda limitada a comentarios propios durante los primeros 15 minutos, con validacion equivalente en frontend, backend y modo demo; los comentarios editados muestran fecha de edicion. Se agrega fecha_edicion al esquema COMENTARIOS y una migracion idempotente en setupAll() para instalaciones existentes.' },
  { v: '1.26.4', date: '2026-07-20', desc: 'Comentarios: ahora renderizan el mismo subset seguro de formato que las descripciones (titulos con #/##, negritas con **texto** y listas con -/*), con estilos mas compactos para conservar la lectura cronologica. La edicion mantiene el texto fuente y el campo de escritura muestra una ayuda breve de sintaxis.' },
  { v: '1.26.3', date: '2026-07-20', desc: 'Proyectos: las columnas Proyecto, Estado, Prioridad, Responsable, Avance y Vence ahora se pueden ordenar en ambos sentidos, con indicador visual y soporte de teclado. Tareas: la vista Kanban suma una barra de desplazamiento horizontal superior sincronizada con el tablero; la barra de controles se reorganiza en tres grupos estables para priorizar Proyecto, busqueda y Mis tareas, separar los filtros especificos y mantener aparte las acciones.' },
  { v: '1.26.2', date: '2026-07-20', desc: 'Mejora UX: las acciones de fila en Proyectos, Tareas, Kanban, Sprints, Usuarios y Roles usan una jerarquia compacta con iconos SVG, tooltips y etiquetas accesibles. Se conserva texto en acciones ambiguas o sensibles como Tareas, Cerrar, Permisos y Activar/Desactivar. La cancelacion de proyectos deja de presentarse visualmente como eliminacion.' },
  { v: '1.26.1', date: '2026-07-16', desc: 'Fix: la campana de notificaciones (v1.26.0) solo tenia el contenedor .topbar-actions en Inicio; en el resto de las paginas (Tareas, Proyectos, Seguimiento, Reportes, Gantt, Configuracion) se insertaba al principio del topbar, antes del boton de colapsar el menu lateral, en vez de a la derecha. Se agrega el contenedor faltante en esas 6 paginas para que quede anclada a la derecha en todas.' },
  { v: '1.26.0', date: '2026-07-13', desc: 'Notificaciones por usuario: nueva campana en el top header (visible en todas las paginas, para Admin y Agente) con contador de no leidas y panel de las ultimas novedades. Se genera una notificacion cuando te asignan una tarea, cambia el estado de una tarea de la que sos responsable, alguien comenta en algo tuyo, o te mencionan con @ en un comentario. El editor de comentarios ahora tiene un selector @ para mencionar usuarios. Al hacer click en una notificacion se abre la tarea/proyecto correspondiente. El contador se refresca solo cada 60s. Backend: nueva hoja NOTIFICACIONES (correr setupAll() o crearHojaNotificaciones() una vez).' },
  { v: '1.25.2', date: '2026-07-08', desc: 'El tab Requerimiento ahora arma su Markdown con la misma estructura que el Informe de Gestion (titulo como encabezado, lista de campos autocompletados, y cada campo manual como seccion propia con "_(sin completar)_" si esta vacio) — antes era una lista plana de bullets. Se agrega el boton "Prellenar desde Descripcion" para copiar la Descripcion de la tarea al campo Requerimiento sin escribir dos veces, pidiendo confirmacion si ya habia texto cargado.' },
  { v: '1.25.1', date: '2026-07-08', desc: 'Fix visual: una regla global de inputs (pensada para texto) inflaba cualquier checkbox a 100% de ancho x 40px de alto. Afectaba sobre todo a los checkboxes de Seccion/Dispositivos del modal de edicion de tarea, que se veian como cuadrados gigantes desalineados de su etiqueta cuando el catalogo tenia valores largos (ej. "Checkout Payment"). Se corrige el tamano de los checkboxes en general, sin afectar el estilo custom del checklist. Ademas, el tab Requerimiento pasa a ir antes que Informe de Gestion, y su vista previa ahora se renderiza con el mismo formato (negritas, lista) que la del Informe en vez de texto plano.' },
  { v: '1.25.0', date: '2026-07-08', desc: 'Fix de fondo: los formularios (Tareas, Proyectos, Gantt) ya no usan listas fijas en el codigo para Estados/Tipos/Prioridades/Sitios/Areas/Tiendas — ahora piden los catalogos reales al servidor, asi que editarlos desde Configuracion > Catalogos se ve reflejado sin esperar un redeploy. Se agregan a esa pantalla los catalogos de Tiendas, Secciones, Estados de sprint y Responsables externos (antes sin UI de edicion). Estados de sprint pasa a validarse de verdad contra su catalogo (antes se ignoraba). El selector de Responsable ahora tambien ofrece los nombres cargados en "Responsables externos" ademas de los usuarios del sistema. Ademas, los 10 catalogos dejan de tener una hoja propia cada uno: ahora viven como filas de la hoja CONFIG (clave/valor), asi el Sheet no se llena de pestanas CAT_* que nadie editaba a mano.' },
  { v: '1.24.0', date: '2026-07-08', desc: 'Tareas: se agregan Seccion y Dispositivos como dimensiones de la tarea (multi-seleccion, editables desde "Editar tarea", igual que Area/Tienda). Nuevo tab "Informe de gestion" en el modal de detalle (autocompletado: proyecto/tienda/seccion/dispositivos/area/responsable/estado/fecha de creacion; manual: version, fecha de implementacion, descripcion general, detalles tecnicos, resultado), se destaca cuando la tarea esta en Documentacion. Nuevo tab "Requerimiento" para armar el brief de Jira/GitLab (Titulo/Proyecto/Tienda/Seccion/Dispositivos/Requerimiento/Detalles/Objetivo), se destaca cuando el area es InfraCommerce o PIM. Ambos tabs tienen indicador de completitud, vista previa, copiar al portapapeles y exportar en Markdown.' },
  { v: '1.23.2', date: '2026-07-08', desc: 'Actividad: el tab Finalizadas muestra el link al informe de gestion de la tarea (cuando lo tiene) y lo incluye en "Copiar resumen".' },
  { v: '1.23.1', date: '2026-07-08', desc: 'Actividad: en el tab Finalizadas, cada tarea muestra su area responsable (Ecom/InfraCommerce/PIM) en vez del responsable individual.' },
  { v: '1.23.0', date: '2026-07-08', desc: 'Actividad: nuevo tab "Finalizadas" con las tareas que pasaron a Finalizada en el rango elegido (una fila por tarea, sin duplicar si se finalizo mas de una vez), mostrando responsable y fecha. Se agrega el boton "Copiar resumen" para armar en texto plano el detalle a enviar (ej. el cierre semanal).' },
  { v: '1.22.1', date: '2026-07-08', desc: 'Actividad: la minuta ya no lee HISTORIAL/LOGS/COMENTARIOS completos en cada consulta; ahora lee solo la columna de fecha para ubicar las filas del rango pedido y trae unicamente esas filas completas. Mismo resultado, mejor tiempo de respuesta a medida que crecen esas hojas.' },
  { v: '1.22.0', date: '2026-07-08', desc: 'Actividad: se agrega un rango Desde/Hasta (maximo 31 dias) con flechas para navegar al periodo anterior/siguiente manteniendo la duracion elegida; en rangos de mas de un dia cada movimiento muestra su fecha ademas de la hora.' },
  { v: '1.21.2', date: '2026-07-07', desc: 'Actividad: el filtro de tipo pasa a tabs (Todo/Altas/Estados/Otros cambios/Comentarios), la minuta agrupa los movimientos por proyecto y el nombre del proyecto linkea a sus tareas.' },
  { v: '1.21.1', date: '2026-07-07', desc: 'Actividad: la minuta ahora incluye las altas del dia (tareas/proyectos/sprints creados), separa los cambios de estado del resto, calcula la hora en el servidor para evitar desfasajes de zona horaria y blinda la exportacion CSV contra formula injection.' },
  { v: '1.21.0', date: '2026-07-07', desc: 'Tareas: se agrega la URL del informe de gestion del portal ecommerce para tareas documentadas. Al pasar de Documentacion a Revision es obligatoria y desde Documentacion ya no se puede saltar directo a Finalizada.' },
  { v: '1.20.0', date: '2026-07-07', desc: 'Actividad: nuevo modulo de minuta diaria para revisar por fecha los comentarios nuevos y cambios registrados, con KPIs, participantes, filtros y exportacion CSV.' },
  { v: '1.19.3', date: '2026-07-07', desc: 'Fix visual: el modal de edicion de tareas alinea sus secciones y campos con una grilla consistente, normaliza la altura de inputs y mejora el espaciado interno.' },
  { v: '1.19.2', date: '2026-07-07', desc: 'Fix visual: el boton Ver mas del detalle de tarea deja de quedar pegado al degradado de la descripcion; ahora se muestra como una accion separada debajo del bloque colapsado.' },
  { v: '1.19.1', date: '2026-07-07', desc: 'Tareas: se reordena el formulario de edicion para mostrar Area responsable junto a Responsable dentro de Gestion, dejando Alcance enfocado en tienda y enlaces asociados.' },
  { v: '1.19.0', date: '2026-07-07', desc: 'Tareas: el formulario de edicion se integra visualmente al modal de detalle. Desde la vista de tarea, Editar abre el mismo contenedor ancho, con secciones ordenadas, Cancelar vuelve al detalle y Guardar refresca la tarea actualizada.' },
  { v: '1.18.2', date: '2026-07-07', desc: 'Fix visual: la vista Kanban mantiene las columnas en una sola fila con scroll horizontal en vez de bajarlas de linea, y la barra de avance reserva espacio para el porcentaje para que no se salga de la tarjeta.' },
  { v: '1.18.1', date: '2026-07-07', desc: 'Tareas: se agrega la accion Clonar en lista, Kanban y modal de detalle. El clon abre el formulario como tarea nueva con la informacion original precargada, permite cambiar tienda, titulo y descripcion antes de guardar, resetea estado/avance y deja una nota editable de origen en la descripcion.' },
  { v: '1.18.0', date: '2026-07-07', desc: 'Tareas: se agrega selector de vista Lista/Kanban. Lista queda como vista por defecto; Kanban muestra solo las tareas del sprint activo, agrupadas por estado y respetando los filtros actuales. El modal de detalle ahora es mas ancho, muestra los links externos junto al contexto de la tarea y colapsa descripciones largas con Ver mas.' },
  { v: '1.17.2', date: '2026-07-07', desc: 'Tareas: las descripciones y observaciones ahora admiten negrita inline con **texto** dentro del subset de formato existente. Se renderiza despues de escapeHtml, igual que titulos y vinetas, para mantener el contenido seguro.' },
  { v: '1.17.1', date: '2026-07-01', desc: 'Gantt: mejora visual respetando la paleta de estados. Las barras dejan de ser un bloque plano con el % en texto y pasan a ser una pista (track) con relleno proporcional al avance_pct, con todos los tonos derivados por color-mix del color del estado (track claro, relleno saturado, borde). Se agregan gridlines verticales por mes alineadas al eje, banderín "Hoy" sobre la línea roja, zebra y hover en filas (label + lane), cabecera del eje sticky y más aire (filas 34→38px, barras 22→24px). Sin cambios de datos ni de lógica: mismas tareas, mismo rango, mismo auto-scroll a hoy.' },
  { v: '1.17.0', date: '2026-07-01', desc: 'Sprints: se agrega la acción "Cerrar" (solo para sprints Activos) en el gestor. Al cerrar, si el sprint tiene tareas sin finalizar, un modal pregunta qué hacer con ellas: moverlas al Backlog, moverlas a otro sprint abierto, o dejarlas en el sprint cerrado. Antes cerrar un sprint (cambiar su estado a Cerrado) no movía nada y las tareas pendientes quedaban "colgadas" bajo el sprint terminado sin aviso. Nuevo handler closeSprint_ en el backend que mueve las tareas (registrando cada cambio en HISTORIAL) y cierra el sprint de forma atómica.' },
  { v: '1.16.7', date: '2026-07-01', desc: 'Tareas: la barra superior mezclaba filtros y botones de acción en un mismo contenedor que hacía wrap sin criterio a 1440px; se separa en dos filas fijas (filtros arriba, acciones abajo). Además, en cada fila el título, los chips (proyecto/área/tienda) y los links externos pasan a ser bloques apilados en vez de texto corrido, así el alto de fila crece de forma predecible con el contenido en vez de cortar en cualquier punto.' },
  { v: '1.16.6', date: '2026-07-01', desc: 'Fix visual: el chip de proyecto 📁 (v1.16.0/v1.16.2) usaba la clase st-progress, la misma que el estado de tarea "En Curso" y el estado de sprint "Activo" — una fila con esas dos condiciones mostraba dos badges ámbar idénticos con significados distintos. Se agrega la clase chip-proyecto (índigo, con variante dark) exclusiva para metadatos, separada de la paleta de estados.' },
  { v: '1.16.5', date: '2026-07-01', desc: 'Tareas: como los filtros ahora persisten entre sesiones (v1.16.3), se agrega el botón "Limpiar filtros (N)" que solo aparece cuando hay al menos uno activo — evita que una vista filtrada de una sesión anterior se lea como "faltan tareas".' },
  { v: '1.16.4', date: '2026-07-01', desc: 'Fix: el botón de acciones de Tareas decía "Eliminar" pero siempre hizo soft delete (pasa la tarea a estado Cancelada, sin borrar la fila ni perder historial). Se renombra a "Cancelar" y se aclara en el confirm, igual que ya se llama la acción equivalente en Sprints, para no sugerir una eliminación irreversible que nunca ocurre.' },
  { v: '1.16.3', date: '2026-07-01', desc: 'Tareas: los filtros (estado, tipo, prioridad, área, tienda, responsable, búsqueda) se guardan en localStorage y se restauran solos al volver a entrar — antes había que rearmarlos cada vez, molesto con 466+ tareas. Se agrega el botón "Mis tareas", que filtra por responsable = usuario logueado.' },
  { v: '1.16.2', date: '2026-07-01', desc: 'Tareas: cuando el filtro está en "Todos los proyectos" cada fila ahora muestra un chip 📁 con el proyecto de esa tarea (antes solo se veía abriendo el detalle). Además, Responsable pasa a ser editable inline en la fila (select), igual que ya funcionaba Estado — antes había que abrir "Editar" para reasignar una tarea.' },
  { v: '1.16.1', date: '2026-07-01', desc: 'Tareas: se agregan los filtros "Tipo" y "Prioridad" a la barra de filtros del listado, junto a Estado/Área/Tienda/Responsable.' },
  { v: '1.16.0', date: '2026-07-01', desc: 'Tareas: el modal de detalle ahora muestra a qué proyecto pertenece la tarea (chip 📁), y el modal de edición suma un campo "Proyecto" para poder reasignarla a otro proyecto sin recrearla — antes no se mostraba en ningún lado y no había forma de cambiarlo. Aplica también al detalle abierto desde Gantt.' },
  { v: '1.15.3', date: '2026-07-01', desc: 'Fix: al crear/renombrar un sprint con un nombre que Google Sheets interpreta como fecha (ej. "Julio 2026"), la celda quedaba autoconvertida a un valor de fecha y el front mostraba el ISO timestamp en vez del texto. Ahora la columna nombre de SPRINTS se fuerza a formato texto plano antes de escribir el valor, tanto en creación como en edición.' },
  { v: '1.15.2', date: '2026-07-01', desc: 'Tareas: el board (sprints + backlog) ya no muestra por defecto las tareas Finalizada/Cancelada — quedan fuera del ruido del trabajo activo, igual que un board de Jira/Linear no muestra lo ya cerrado de sprints pasados. Se ven igual eligiendo ese estado puntual en el filtro #fEstado (agrupadas por su sprint/backlog). El status bar indica cuántas quedaron ocultas. Para revisar/auditar lo cerrado cross-proyecto sigue estando Seguimiento (bucket "Finalizadas").' },
  { v: '1.15.1', date: '2026-07-01', desc: 'Fix: en la vista agrupada de Tareas (v1.15.0), apiGetSprints() excluye por defecto los sprints Cancelado — una tarea que seguía apuntando a un sprint cancelado no encontraba grupo y desaparecía del listado (aunque sí se contaba en "N tareas."). Se agrega STATE.allSprints (con incluir_cancelados:true) para el agrupado, mostrando esas tareas en su propia sección "Cancelado"; el gestor de sprints y el <select> del modal siguen ocultando cancelados como antes.' },
  { v: '1.15.0', date: '2026-07-01', desc: 'Tareas: se reemplazan los tabs "Sprint"/"Backlog" por una sola vista que trae todas las tareas del proyecto de una vez y las agrupa en secciones colapsables — una por cada sprint con tareas (Activo abierto por defecto, resto colapsado) y "Backlog" al final. El estado abierto/cerrado de cada sección se recuerda por proyecto (localStorage). Se agregó botón "Expandir todo"/"Colapsar todo"; "Exportar todo" ya no hace un fetch aparte, usa las tareas ya cargadas.' },
  { v: '1.14.5', date: '2026-07-01', desc: 'Descripciones de tareas y proyectos admiten un subset simple de formato — "# Título", "## Subtítulo" y "- viñeta" — renderizado en el detalle de tarea (renderRichText en api.js, siempre sobre texto ya escapado). Placeholder en los textareas de edición con la sintaxis disponible.' },
  { v: '1.14.4', date: '2026-07-01', desc: 'Proyectos y Tareas: el límite de "descripcion" (y "observaciones" en Proyectos) sube de 2000 a 4000 caracteres para permitir contexto más detallado. Comentarios se mantiene en 2000.' },
  { v: '1.14.3', date: '2026-06-30', desc: 'Auditoría de sprints — 2 fixes: updateTarea_ ahora valida que id_sprint exista (antes solo createTarea_ lo hacía, dejando FK rotas al editar); el modal de tarea conserva el sprint actual en el <select> aunque esté cancelado (marcado "(cancelado)"), evitando que se borre la asignación al guardar otros cambios sin querer.' },
  { v: '1.14.2', date: '2026-06-30', desc: 'Tareas: el modal "Gestionar sprints" seguía con scroll horizontal porque la regla global table{min-width:820px} (pensada para tablas de datos) le ganaba al ancho del modal; se anula puntualmente y se trunca con ellipsis el nombre del sprint cuando es un string sin espacios.' },
  { v: '1.14.1', date: '2026-06-30', desc: 'Tareas: el modal "Gestionar sprints" se ensanchó y la tabla usa columnas de ancho fijo para evitar el scroll horizontal en desktop.' },
  { v: '1.14.0', date: '2026-06-30', desc: 'Gantt: el filtro de sprint ahora pide al backend (id_sprint) en vez de traer todas las tareas y filtrar en cliente; se agregó modo demo equivalente. Se extrajo el modal de detalle de tarea a tareaDetalle.js, compartido entre Tareas y Gantt (antes duplicado). Las filas/barras del Gantt son ahora navegables por teclado (Enter/Espacio abre el detalle). Las tareas sin fecha excluidas del gráfico muestran un link directo a Tareas para completarlas. Limpieza: filtros redundantes (estado Cancelada, sprint en cliente) y constante sin usar.' },
  { v: '1.13.1', date: '2026-06-30', desc: 'Fix Gantt: las tareas con fecha límite pasada (vencidas) ya no se recortaban a una barra mínima superpuesta en "hoy", perdiendo su rango real — ahora el gráfico conserva todo el rango de fechas y solo hace auto-scroll para mostrar "hoy" al abrir. También se corrigió el cálculo de "hoy" (usaba UTC vía toISOString, lo que corría la fecha un día en husos horarios negativos durante la noche) y se eliminó una colisión de nombre de función global (_today) con api.js que rompía el flag "vencida" en modo demo.' },
  { v: '1.13.0', date: '2026-06-30', desc: 'Gantt: la línea temporal arranca siempre en la fecha actual (barras previas se recortan al borde); se quitó el listado de "tareas sin fechas" (quedan excluidas del módulo); nuevo filtro por sprint; click en una tarea abre el modal de detalle con comentarios/checklist/adjuntos/historial.' },
  { v: '1.12.0', date: '2026-06-30', desc: 'Tareas: tabs "Sprint" (default, precarga el sprint Activo vigente) y "Backlog" (tareas sin sprint asignado); ambas cargan server-side filtradas por id_sprint en vez de traer toda la hoja TAREAS. Nuevo botón "Exportar todo" para CSV sin filtro de tab.' },
  { v: '1.11.1', date: '2026-06-30', desc: 'Checklist de tareas: la tab "Checklist" del detalle muestra ahora hechos/total sin necesidad de abrirla. El backend rechaza marcar una tarea como Finalizada si quedan ítems del checklist sin completar.' },
  { v: '1.11.0', date: '2026-06-29', desc: 'Catálogos: nueva tab en Configuración para editar valores de estados, tipos, prioridades, sitios y áreas directamente desde la UI (solo Admin). Backend con getCatCached_ para validar contra valores dinámicos del Sheet.' },
  { v: '1.10.1', date: '2026-06-29', desc: 'Sprints — auditoría: FK id_sprint valida existencia en backend; _refreshSprints con try/catch; fecha_fin≥fecha_inicio en create/update; historial de soft-delete con estado real (Sprints, Tareas, Proyectos); nombre de sprint único; CSV incluye columna sprint' },
  { v: '1.10.0', date: '2026-06-29', desc: 'Sprints (estilo Jira): hoja SPRINTS + columna id_sprint en TAREAS; ABM de sprints desde Tareas ("Gestionar sprints"), asignación tarea→sprint, filtro por sprint y chip en fila/detalle. Sprints globales (multi-proyecto)' },
  { v: '1.9.3', date: '2026-06-29', desc: 'Tareas: clic en fila abre modal de detalle — info completa + actividad (comentarios, checklist, adjuntos, historial) embebida; editar desde el detalle funciona con "Todos los proyectos"' },
  { v: '1.9.2', date: '2026-06-29', desc: 'Proyectos: filtro de responsable en toolbar; Tareas: label mejorado en filtro de resp.' },
  { v: '1.9.1', date: '2026-06-29', desc: 'Tareas: opción "Todos los proyectos" en el selector — carga todas las tareas; + Nueva tarea se deshabilita al seleccionar "Todos"' },
  { v: '1.9.0', date: '2026-06-29', desc: 'Comentarios: edición inline del texto propio — botón Editar en hover, textarea inline con Guardar/Cancelar, badge (editado); backend valida autoría' },
  { v: '1.8.1', date: '2026-06-29', desc: 'Checklist: checkbox custom, hover states, botón eliminar oculto, barra de progreso con gradiente y clase chk-complete al 100%' },
  { v: '1.8.0', date: '2026-06-29', desc: 'Colapso de sidebar en desktop — botón en topbar, estado persistido en localStorage (pcc_sidebar), anti-flash en los 7 HTML' },
  { v: '1.7.0', date: '2026-06-28', desc: 'Navegación alineada al estándar Luquin — área de usuario como chip compacto + dropdown (reemplaza botones apilados en el footer); elimina renderUserChip muerto (topbar); tab de admin "Conexión" → "Integraciones"' },
  { v: '1.6.4', date: '2026-06-23', desc: 'Shell: área de usuario en sidebar footer con rol, cambiar contraseña y logout' },
  { v: '1.6.3', date: '2026-06-23', desc: 'Shell: version badge con popover changelog en sidebar brand de todas las páginas' },
  { v: '1.6.2', date: '2026-06-23', desc: 'Layout — módulos utilizan todo el ancho disponible del área de contenido' },
  { v: '1.6.1', date: '2026-06-20', desc: 'S11 — mejoras módulo tareas: edición inline, filtros avanzados' },
  { v: '1.6.0', date: '2026-06-18', desc: 'S10 — pulido: filtros, reportes por área/tienda, quick-create' },
  { v: '1.5.0', date: '2026-06-15', desc: 'S9 — vista Gantt interactiva' },
  { v: '1.4.0', date: '2026-06-10', desc: 'S8 — checklists de subtareas + tipo Subtarea deprecado' },
];

function initVersionBadge() {
  const span    = document.getElementById('sidebarVersion');
  const btn     = document.getElementById('sidebarVersionBtn');
  const popover = document.getElementById('versionPopover');
  if (!span) return;
  span.textContent = `v${VERSION.number}`;
  if (!btn || !popover || !CHANGELOG.length) return;
  popover.innerHTML =
    '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid var(--sidebar-line)">Historial de cambios</div>'
    + CHANGELOG.map(c =>
      `<div style="margin-bottom:8px;">`
      + `<span style="font-weight:600;font-size:13px;">v${c.v}</span>`
      + `<span style="color:var(--muted);font-size:11px;margin-left:6px;">${c.date}</span>`
      + `<div style="font-size:12px;margin-top:2px;line-height:1.4;">${c.desc}</div>`
      + `</div>`
    ).join('');
  btn.style.cursor = 'pointer';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    popover.style.display = popover.style.display !== 'none' ? 'none' : 'block';
  });
  document.addEventListener('click', function() { popover.style.display = 'none'; });
}

/* ─── DOMINIOS (espejo de apps-script/Config.gs) ──────────── */

const ESTADOS_PROYECTO = ['Por Hacer', 'En Análisis', 'En Curso', 'Bloqueado', 'Finalizado', 'Cancelado'];
const ESTADOS_TAREA    = ['Por Hacer', 'En Análisis', 'Maquetación', 'En Curso', 'QA', 'Documentación', 'Revisión', 'Bloqueada', 'Finalizada', 'Cancelada'];
// 'Subtarea' deprecada (S8: reemplazada por checklist). No se ofrece para tareas
// nuevas; las migradas conservan su tipo (ver tipoOptions() en tareas.html).
const TIPOS_TAREA      = ['Historia', 'Tarea', 'Error'];
const PRIORIDADES      = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
const SITIOS           = ['Sporting', 'Woker', 'PIM', 'B2B', 'Todos'];
const ESTADOS_SPRINT   = ['Planificado', 'Activo', 'Cerrado', 'Cancelado'];
const ESTADOS_SPRINT_CERRADOS = ['Cerrado', 'Cancelado'];

// S6: dimensiones de tarea. Área = equipo que ejecuta (≠ responsable persona).
const AREAS            = ['Ecom', 'InfraCommerce', 'PIM'];
const TIENDAS          = ['Sporting', 'Woker', 'B2B'];

// Qué enlace externo corresponde a cada área.
const AREA_LINK = {
  'InfraCommerce': 'url_jira',
  'PIM':           'url_gitlab',
};

// Dimensiones reutilizables (Informe de Gestión / Requerimiento).
// Sin UI de administración todavía (igual que TIENDAS): para ampliar la lista,
// editar directamente la hoja CAT_SECCIONES en el Sheet.
const SECCIONES    = ['PLP', 'PDP', 'Home', 'Checkout', 'Carrito', 'Cuenta', 'Buscador', 'Otro'];
const DISPOSITIVOS = ['Mobile', 'Tablet', 'Desktop'];

const ESTADOS_PROYECTO_CERRADOS = ['Finalizado', 'Cancelado'];
const ESTADOS_TAREA_CERRADOS    = ['Finalizada', 'Cancelada'];

// Clase CSS de badge por estado (definidas en main.css).
const ESTADO_CLASS = {
  'Por Hacer':     'st-todo',
  'En Análisis':   'st-analysis',
  'Maquetación':   'st-maquetacion',
  'En Curso':      'st-progress',
  'QA':            'st-qa',
  'Documentación': 'st-docs',
  'Revisión':      'st-revision',
  'Bloqueado':     'st-blocked',
  'Bloqueada':     'st-blocked',
  'Finalizado':    'st-done',
  'Finalizada':    'st-done',
  'Cancelado':     'st-cancel',
  'Cancelada':     'st-cancel',
};

const ESTADO_CLASS_SPRINT = {
  'Planificado': 'st-todo',
  'Activo':      'st-progress',
  'Cerrado':     'st-done',
  'Cancelado':   'st-cancel',
};

const PRIORIDAD_CLASS = {
  'Highest': 'pr-highest',
  'High':    'pr-high',
  'Medium':  'pr-medium',
  'Low':     'pr-low',
  'Lowest':  'pr-lowest',
};

/* ─── ESTADO GLOBAL ───────────────────────────────────────── */

const STATE = {
  proyectos: [],
  tareas:    [],
  sprints:   [],
  usuarios:  [],
  catalogos: null,
  resumen:   null,
  filtros:   { estado: '', responsable: '', sitio: '', q: '' },
};

/* ─── CONFIG (localStorage) ───────────────────────────────── */

// URL canónica del Web App de Apps Script. Pegá acá la URL del deploy de pcc
// para que la app funcione out-of-the-box; queda vacía = modo demo por defecto.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzw6rZf-6EJrLN3aJ3aCxOzjNrv6j5PcfAJjpvu8BZ3am1r0F3WKvgOT2qH_4w3GiZ3sQ/exec';

const CFG = {
  // Override de localStorage (opcional) → si no, la constante canónica.
  get apiUrl()  { return localStorage.getItem('pcc_api_url') || APPS_SCRIPT_URL; },
  set apiUrl(v) { if (v) { localStorage.setItem('pcc_api_url', v); } else { localStorage.removeItem('pcc_api_url'); } },

  // Modo demo (datos locales): solo con flag explícito o sin URL efectiva.
  isMock() {
    if (localStorage.getItem('pcc_demo') === '1') return true;
    if (/[?&]demo=1\b/.test(location.search)) return true;
    return !this.apiUrl;
  },
};

/* ─── THEME ───────────────────────────────────────────────── */

const THEME_KEY = 'pcc_theme';

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function _updateThemeToggles(theme) {
  var t = theme || document.documentElement.getAttribute('data-theme') || 'light';
  var isLight = t === 'light';
  document.querySelectorAll('.th-icon').forEach(function(el) {
    el.textContent = isLight ? '☾' : '☀';
  });
  document.querySelectorAll('.th-label').forEach(function(el) {
    el.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  });
}

function setTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  _updateThemeToggles(next);
}

function toggleTheme() {
  setTheme(getCurrentTheme() === 'light' ? 'dark' : 'light');
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(saved);
}
