# Project Control Center

Sistema interno de gestión, seguimiento y presentación de proyectos. Centraliza
proyectos, tareas, estados, responsables, comentarios, adjuntos, dashboard,
reportes e historial de cambios. Reemplaza Jira en el flujo propio del equipo.

## Stack

- HTML / CSS / Vanilla JS (sin frameworks)
- Google Apps Script (backend)
- Google Sheets (base de datos)
- Google Drive (adjuntos — desde Sprint 3)
- GitHub Pages (hosting)

## Estructura

```
/
├── index.html              # Dashboard / hub        (Sprint 1)
├── login.html              # Autenticación          (Sprint 1)
├── config.js · auth.js · api.js
├── src/css/main.css
├── modules/
│   ├── proyectos/ · tareas/ · seguimiento/ · reportes/ · admin/
├── apps-script/            # Backend GAS (ver docs/gas-setup.md)
│   ├── Config.gs Helpers.gs Logger.gs Validators.gs
│   ├── Auth.gs Usuarios.gs Proyectos.gs Tareas.gs
│   ├── Comentarios.gs Historial.gs Adjuntos.gs Dashboard.gs
│   └── Code.gs Setup.gs
├── actividad.js            # Panel Comentarios + Historial (reutilizable)
├── docs/
│   ├── db_structure.md     # Modelo de datos
│   └── gas-setup.md        # Cómo desplegar el backend
├── README.md · CLAUDE.md · AGENTS.md
```

## Cómo correr localmente (frontend)

```
python -m http.server 3000
```

Sin URL de API configurada, el frontend corre en **modo demo** con datos locales.
Para conectar al backend real, seguir [docs/gas-setup.md](docs/gas-setup.md) y
cargar la URL del Web App desde la pantalla de configuración.

## Roles

- **Admin** (`id_rol = 1`): acceso total, escribe y elimina (soft delete).
- **Agente** (`id_rol = 2`): lectura y exportación. Los controles de escritura
  (`.admin-only`) se deshabilitan automáticamente.

## Estado del proyecto

| Sprint | Estado |
|--------|--------|
| S1 — Proyectos + Tareas CRUD | ✅ Backend + Frontend (validado en modo demo) |
| S2 — Comentarios + Historial | ✅ Backend + Frontend (validado en modo demo) |
| S3 — Adjuntos (Drive) | ✅ Backend + Frontend (validado en modo demo) |
| S4 — Seguimiento + Reportes | ✅ Frontend (agrega sobre datos existentes, validado en demo) |
| S5 — Migración activos Jira | ✅ Migrados 37 proyectos + 456 tareas |
| S6 — Tarea: área, tienda, enlaces externos | ✅ Backend + Frontend (validado en demo) |
| S7 — Gestión de usuarios y roles | ✅ Módulo admin + responsable como selector (validado en demo) |
| S8 — Checklists + racionalización de tipos | ✅ Hoja CHECKLIST + drawer + Subtarea deprecada (validado en demo) |
| S9 — Vista Gantt | Pendiente |
| S10 — Pulido (front, estructura, UX) | Pendiente |

Plan completo y decisiones: ver `CLAUDE.md` y la planificación aprobada.

## Versioning

Ver `config.js` → `VERSION` y la tabla de bumps en `CLAUDE.md`.
