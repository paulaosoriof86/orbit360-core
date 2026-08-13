# Runbook — aplicar hotfix P0 Config + Equipo v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Cerrar el P0 de Config/Equipo detectado en la reauditoría de certeza:

```txt
- no guardar key/token en frontend/store;
- usar credentialRef/backend_required;
- motivo obligatorio en plan/módulos/integraciones;
- motivo obligatorio en crear/editar/inactivar usuarios;
- bloqueo de último administrador activo;
- reset permisos con confirmación reforzada y motivo;
- auditoría unificada.
```

## Script creado

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs
```

## Comando único

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs
```

## Qué hace

- Hace backup local en `_backups/`.
- Parchea únicamente:
  - `orbit360-platform/modules/configuracion.js`
  - `orbit360-platform/modules/equipo.js`
- Ejecuta `node --check` a ambos módulos.
- Genera reporte en `_orbit360_reports/`.
- No hace commit.
- No hace push.
- No hace deploy.
- No toca Firestore.
- No toca backend protegido.
- No toca `index.html`.

## Configuración — cambios aplicados

- `configIntegracion` deja de capturar/guardar key/token.
- Reemplaza secreto por `credentialRef` conceptual.
- Usa `backend_required` cuando no hay proveedor seguro.
- Estado de integración: `pendiente_conexion`.
- Motivo obligatorio para guardar referencia de integración.
- Motivo obligatorio al cambiar plan.
- Motivo obligatorio al guardar módulos activos.
- Auditoría en `auditoria`.

## Equipo — cambios aplicados

- Crear usuario exige motivo.
- Editar usuario/roles/permisos exige motivo.
- Inactivar usuario exige motivo.
- Bloquea inactivar último administrador activo.
- Reset de permisos exige confirmación reforzada `RESTABLECER`.
- Reset de permisos exige motivo.
- Auditoría en `auditoria`.

## Qué revisar después

El comando debe devolver JSON con:

```txt
ok: true
checks: configuracion.js code 0, equipo.js code 0
reportFile: _orbit360_reports/...
backupRoot: _backups/...
```

## Impacto Claude/prototipo

Sí aplica. Claude debe conservar:

- integraciones preparadas sin secretos;
- `credentialRef/backend_required`;
- estado pendiente de conexión;
- gates administrativos con motivo;
- bloqueo de último admin;
- auditoría visible para roles autorizados.

## Estado

Script de empalme Config/Equipo creado. Pendiente ejecución local o aplicación controlada sobre worktree.