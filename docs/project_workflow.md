# Project Workflow — Project Control Center

| Campo | Detalle |
|-------|---------|
| Versión | v1.0 |
| Actualizado | 2026-06-25 |
| Estado | Activo |
| Documentos relacionados | `../project-standards/ai_rules.md` · `../project-standards/style_guide.md` · `CLAUDE.md` |

---

## 1. Propósito

Workflow operativo del Project Control Center: panel de administración de usuarios, sesiones, roles y acceso a proyectos. Las reglas genéricas de proceso viven en `../project-standards/project_workflow_template.md`.

---

## 2. Documentos maestros

| Necesito saber... | Ir a... |
|---|---|
| Reglas de colaboración con IA | `../project-standards/ai_rules.md` |
| Colores, CSS, Git | `../project-standards/style_guide.md` |
| Autenticación y sesiones | `../project-standards/login_standard.md` |
| Convenciones GAS | `../project-standards/apps_script_standards.md` |
| Instrucciones específicas para Claude Code | `CLAUDE.md` |

---

## 3. Tipos de cambios y riesgo

| Tipo | Riesgo | Requiere |
|------|--------|----------|
| Documentación, labels, copy | Bajo | Commit claro |
| CSS, layout | Bajo–Medio | Smoke visual |
| JS frontend, módulos | Medio | Smoke + consola |
| GAS, rutas, config | Alto | Auditoría previa |
| Auth, sesiones, roles | Crítico | Ver §7 |

---

## 4. Flujo de trabajo estándar

```
1. Descubrimiento  → entender problema, alcance, restricciones
2. Auditoría       → sin modificar archivos (cuando el alcance no está claro)
3. Implementación  → cambios pequeños, archivos explícitos
4. Validación      → smoke, consola, flujo de login end-to-end
5. Documentación   → CHANGELOG, decisiones si aplica
6. Release         → bump de versión en config.js, push a main
```

---

## 5. Flujo de release

1. Smoke del flujo principal: login → acceso a módulo → cierre de sesión
2. Bump de versión en `config.js`
3. Entrada en CHANGELOG
4. Commit con prefijo convencional
5. Push a `main`
6. Verificar GitHub Pages (2–3 min de propagación)

---

## 6. Checklist pre-push

```
[ ] Login funciona end-to-end (token generado, sesión válida)
[ ] Roles reflejados correctamente (admin vs. agente vs. viewer)
[ ] Consola sin errores
[ ] Versión actualizada en config.js
[ ] Entrada en CHANGELOG
```

---

## 7. Freeze zones

### 7.1 Zonas congeladas

| Zona | Razón |
|------|-------|
| `apps-script/Auth.gs` | Genera y valida tokens UUID; maneja tabla SESIONES |
| `apps-script/` — funciones `doPost`, `getConfig_` | Router principal y resolución de credenciales |
| `src/js/auth.js` | Lógica de sesión en el frontend (guards, cierre de sesión) |
| `src/data/usuarios.json` | Fixtures de usuarios; cambio puede romper smoke de login |
| Script Properties del GAS | Credenciales — nunca en código |
| Tabla `SESIONES` en Google Sheets | Tokens activos; modificar columnas rompe el auth |

### 7.2 Protocolo para freeze zones

1. Auditoría del módulo (sin modificar)
2. Identificar todas las dependencias (frontend + GAS + Sheet)
3. Implementar en etapas con archivos explícitos
4. Validar flujo de login completo antes de commitear
5. Documentar el cambio en `CLAUDE.md` o `docs/decisions/`

### 7.3 Declaración de freeze en prompts

```
Modificar solo:
- src/js/[módulo].js
- styles.css

No modificar:
- apps-script/Auth.gs
- src/js/auth.js
- config.js (sección AUTH)
- src/data/usuarios.json
```

---

## 8. Smoke visual y QA

```
[ ] Página de login carga sin error
[ ] Login con credenciales correctas genera sesión y redirige
[ ] Login con credenciales incorrectas muestra error (no rompe)
[ ] Cierre de sesión limpia el token
[ ] Módulos muestran solo lo que el rol permite
[ ] Consola sin errores críticos
[ ] Mobile: formulario de login usable sin overflow
```

---

## 9. Convenciones del proyecto

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Páginas de módulo | `modules/<area>/<nombre>.html` | `modules/admin/usuarios.html` |
| Funciones GAS privadas | sufijo `_` | `validateToken_()`, `getConfig_()` |
| Claves de session storage | prefijo del proyecto | `pcc_session`, `pcc_active_role` |
| Columnas del Sheet | UPPER_SNAKE_CASE | `SESSION_TOKEN`, `USUARIO_ID` |
| Variables de Script Properties | UPPER_SNAKE_CASE | `ADMIN_PASSWORD_HASH` |

---

## 10. Aprendizajes — Project Control Center

> Documentar aprendizajes aquí a medida que aparezcan.

### 10.1 Hash SHA-256 del lado del GAS

Las contraseñas se hashean en el GAS antes de compararse con el valor almacenado en Sheets. El frontend nunca maneja la contraseña en texto plano más allá del campo de input. No implementar hashing en el frontend.
