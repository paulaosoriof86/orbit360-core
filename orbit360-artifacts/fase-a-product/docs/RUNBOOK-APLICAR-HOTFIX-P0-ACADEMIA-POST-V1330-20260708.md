# Runbook — aplicar hotfix P0 Academia post v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Cerrar el P0 de Academia post-candidata Claude v1330:

```txt
- incorporar matriz roles/permisos/acciones sensibles;
- incorporar auditoría unificada;
- incorporar diferencia historial interno vs historial cliente;
- dejar ruta de continuidad para modificaciones locales post-Claude;
- conservar progreso/certificados existentes.
```

## Script creado

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs
```

## Comando único

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs
```

## Qué hace

- Hace backup local en `_backups/`.
- Parchea únicamente:
  - `orbit360-platform/data/academia-plus.js`
- Agrega dos cursos/rutas:
  - `Roles, permisos y auditoría segura Orbit 360`.
  - `Cambios locales post-Claude y continuidad del prototipo`.
- Incrementa `CONTENT_V` para resincronizar contenido conservando progreso/certificado por la lógica existente.
- Ejecuta `node --check` a `academia-plus.js`.
- Genera reporte en `_orbit360_reports/`.
- No hace commit.
- No hace push.
- No hace deploy.
- No toca backend protegido.
- No toca `index.html`.

## Curso 1 — Roles, permisos y auditoría segura

Incluye:

- matriz de roles base;
- permisos por módulo;
- último administrador protegido;
- motivo obligatorio;
- confirmación reforzada;
- bloqueos sanos;
- auditLog/auditoría;
- datos prohibidos;
- historial cliente vs historial interno;
- casos Cobros/M5/Integraciones.

## Curso 2 — Cambios locales post-Claude

Incluye:

- hotfixes Cobros + Conciliaciones;
- hotfix Portal metadata-only;
- hotfix Config/Equipo credentialRef/gates;
- cómo auditar candidatas futuras;
- validaciones agrupadas;
- obligación de documentar todo para Claude.

## Qué revisar después

El comando debe devolver JSON con:

```txt
ok: true
checks: academia-plus.js code 0
reportFile: _orbit360_reports/...
backupRoot: _backups/...
```

## Impacto Claude/prototipo

Sí aplica. Claude debe conservar estas rutas y convertirlas en UI profunda, interactiva, por rol, con progreso, evaluaciones útiles y certificados.

## Estado

Script de empalme Academia post v1330 creado. Pendiente ejecución local o aplicación controlada sobre worktree.