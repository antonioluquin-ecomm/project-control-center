# Setup del GAS — Project Control Center

> Los pasos genéricos (crear proyecto GAS, publicar Web App, redeploy, límites) están en [`../project-standards/gas_setup_template.md`](../project-standards/gas_setup_template.md).
> Este archivo cubre solo lo específico de este proyecto.

---

## Archivos `.gs` a copiar

En el editor GAS, crear una pestaña por cada archivo y pegar su contenido:

| Archivo repo (`apps-script/`) | Pestaña GAS | Contenido |
|-------------------------------|-------------|-----------|
| `Config.gs` | `Config` | Constantes, nombres de hojas, columnas |
| `Helpers.gs` | `Helpers` | Utilidades compartidas |
| `Logger.gs` | `Logger` | Logging en el Sheet |
| `Validators.gs` | `Validators` | Validaciones de entrada |
| `Auth.gs` | `Auth` | Login, sesiones, roles, guards |
| `Usuarios.gs` | `Usuarios` | CRUD de usuarios |
| `Proyectos.gs` | `Proyectos` | CRUD de proyectos |
| `Tareas.gs` | `Tareas` | CRUD de tareas |
| `Comentarios.gs` | `Comentarios` | CRUD de comentarios |
| `Historial.gs` | `Historial` | Log de cambios campo a campo |
| `Adjuntos.gs` | `Adjuntos` | Subida de archivos a Google Drive |
| `Dashboard.gs` | `Dashboard` | KPIs y métricas del dashboard |
| `Setup.gs` | `Setup` | Bootstrap y seeding inicial |
| `Code.gs` | `Code` | Router principal `doPost` / `doGet` |

Eliminar el `Code.gs` de ejemplo vacío si quedó duplicado.

---

## Script Properties requeridas

| Propiedad | Descripción |
|-----------|-------------|
| `SPREADSHEET_ID` | ID del Google Sheet `Project Control Center — Base de Datos` |

La URL del Web App **no** va en Script Properties — va en `localStorage` del browser (`pcc_api_url`).

---

## Google Sheet

Crear un Google Sheet vacío y nombrarlo **`Project Control Center — Base de Datos`**.

No crear hojas manualmente — el GAS las crea con `setupAll`.

---

## Bootstrap de la base de datos

Después de configurar `SPREADSHEET_ID` y autorizar permisos:

1. En el editor GAS: seleccionar `setupAll` en el dropdown → **Ejecutar**
2. Autorizar los permisos de Sheets cuando lo pida
3. Crear el primer usuario admin:
   ```javascript
   function _admin() { seedAdmin('vos@empresa.com', 'TuClave123'); }
   ```
   Seleccionar `_admin` → Ejecutar

---

## Adjuntos en Google Drive

- La primera subida de adjunto crea automáticamente una carpeta raíz **"Project Control Center — Adjuntos"** en el Drive del dueño del GAS y guarda su ID en `DRIVE_ROOT_FOLDER_ID` (Script Property).
- Para usar una carpeta existente: setear `DRIVE_ROOT_FOLDER_ID` a mano antes de la primera subida.
- Al autorizar el deploy, aceptar el permiso de **Google Drive** que pedirá GAS.
- El frontend redimensiona imágenes (máx. 1600px, JPEG) antes de enviarlas; el backend rechaza payloads > 7 MB.

---

## Conectar el frontend

Sin URL configurada, el frontend corre en modo demo con datos locales.

Para conectar al GAS real: abrir la app en el browser y cargar la URL del Web App en el campo de configuración (se guarda en `localStorage` como `pcc_api_url`).

---

## Verificación

```
Health check: URL_DEL_WEBAPP?accion=health → {"ok":true,"status":"running"}
Login de prueba: ejecutar _testDoPost en el editor GAS → ver logs
```

---

## Seguridad

- Las contraseñas se almacenan como `SHA256(salt + SHA256(pass))` — nunca en texto plano.
- `SPREADSHEET_ID` y la URL del Web App nunca van en el repo — van en Script Properties / localStorage.
