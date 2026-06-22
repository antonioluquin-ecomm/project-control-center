# Setup del backend (Google Apps Script + Sheets)

Pasos para dejar operativo el backend del Sprint 1. Es la parte manual en Google
(crear el Sheet y publicar el Web App); el código ya está en `apps-script/`.

---

## 1. Crear el Google Sheet

1. Crear un Google Sheet nuevo y nombrarlo **`Project Control Center — Base de Datos`**.
2. Copiar su **ID** (de la URL: `https://docs.google.com/spreadsheets/d/`**`ESTE_ID`**`/edit`).

## 2. Crear el proyecto de Apps Script

1. En el Sheet: `Extensiones > Apps Script`.
2. Crear un archivo `.gs` por cada uno de `apps-script/` y pegar su contenido:
   `Config.gs · Helpers.gs · Logger.gs · Validators.gs · Auth.gs · Usuarios.gs · Proyectos.gs · Tareas.gs · Comentarios.gs · Historial.gs · Adjuntos.gs · Dashboard.gs · Code.gs · Setup.gs`.
3. Borrar el `Code.gs` de ejemplo si quedó vacío/duplicado.

## 3. Configurar Script Properties

`Configuración del proyecto (⚙) > Propiedades del script > Agregar propiedad`:

| Clave | Valor |
|-------|-------|
| `SPREADSHEET_ID` | el ID copiado en el paso 1 |

## 4. Bootstrap de la base

En el editor de Apps Script:

1. Seleccionar la función `setupAll` en el dropdown → **Ejecutar**.
   Autorizar permisos cuando lo pida. Crea todas las hojas, headers y catálogos.
2. Crear el primer admin: pegar un wrapper y ejecutarlo:
   ```javascript
   function _admin() { seedAdmin('vos@empresa.com', 'TuClave123'); }
   ```
   Seleccionar `_admin` → Ejecutar.

## 5. Publicar el Web App

1. `Implementar > Nueva implementación > Aplicación web`.
2. **Ejecutar como:** Yo (el dueño del Sheet).
3. **Quién tiene acceso:** Cualquier usuario.
4. Copiar la **URL del Web App** (`.../exec`). El sistema usa su propia auth por
   sesión; no delegar a Google.

> Tras cada cambio de código: `Implementar > Administrar implementaciones > editar > Nueva versión`. La URL no cambia.

## 6. Verificar

- **Health:** abrir en el navegador `URL_DEL_WEBAPP?accion=health` → debe responder
  `{"ok":true,"status":"running",...}`.
- **doPost:** en el editor, ejecutar `_testDoPost` → en los registros debe verse
  `{"ok":true,"usuarios_configured":true}`.
- **Login de prueba:** ejecutar un wrapper:
  ```javascript
  function _testLogin() {
    Logger.log(doPost({ postData: { contents: JSON.stringify({
      action: 'login', email: 'vos@empresa.com', password_hash: '<SHA256 de TuClave123>'
    }) } }).getContent());
  }
  ```
  (o probarlo desde el frontend en el siguiente sprint).

## 6b. Adjuntos en Drive (Sprint 3)

- La primera subida crea automáticamente una carpeta raíz **"Project Control
  Center — Adjuntos"** en el Drive del dueño del GAS, y guarda su id en Script
  Properties (`DRIVE_ROOT_FOLDER_ID`). Cada proyecto tiene su subcarpeta
  `proyecto-{id}`. Para usar una carpeta existente, setear esa propiedad a mano.
- Al autorizar el deploy, aceptar el permiso de **Google Drive** que pedirá GAS.
- Cada archivo se comparte como *"cualquiera con el enlace puede ver"* para poder
  mostrar la miniatura en la app. Son imágenes operativas internas; si se
  necesitan privadas, en un sprint futuro se sirven vía el Web App con token.
- El frontend redimensiona las imágenes (máx. 1600px, JPEG) antes de enviarlas;
  el backend rechaza payloads > 7 MB.

## 7. Conectar el frontend

La URL del Web App se carga en el frontend vía `config.js` / `localStorage`
(`pcc_api_url`). Sin URL configurada, el frontend corre en **modo demo** con datos
locales. Detalle en el README cuando se entregue el frontend.

---

**Seguridad:** las contraseñas viven solo hasheadas (`SHA256(salt+SHA256(pass))`).
Nunca commitear el `SPREADSHEET_ID` ni la URL del Web App en el repo — van en
Script Properties / localStorage.
