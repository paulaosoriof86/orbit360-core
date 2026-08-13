# Runbook — validar post-runner hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Después de ejecutar el runner único de hotfixes P0, validar si el worktree queda listo para commit local controlado.

## Script creado

```txt
orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
```

## Comando

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
```

## Qué valida

- Rama correcta.
- Git status.
- Cambios fuera de la lista permitida.
- Protegidos sin cambios.
- `node --check` en seis archivos:
  - `modules/cobros.js`.
  - `modules/conciliaciones.js`.
  - `modules/portal.js`.
  - `modules/configuracion.js`.
  - `modules/equipo.js`.
  - `data/academia-plus.js`.
- Patrones prohibidos:
  - `readAsDataURL`.
  - `base64`.
  - `factData`.
  - `ci-key`.
  - `saved.key`.
  - `key` directo desde integración.
  - copy visible de token/API key/secreto.
- Señales esperadas de hotfix:
  - Cobros `Validada (por confirmar)`.
  - factura metadata-only.
  - M5 `VALIDADA · no aplicada`.
  - Portal `soporteDocumentoId` y `storageEstado`.
  - Config `credentialRef` y `backend_required`.
  - Equipo bloqueo último admin.
  - Academia roles/auditoría segura.

## Resultado esperado

```txt
ok: true
status: commit_ready
```

## Qué hacer si da commit_ready

- Preparar commit local controlado solo de los seis archivos permitidos.
- No hacer deploy.
- No hacer merge.
- No tocar main.
- Copiar salida/reporte a ChatGPT para registrar cierre.

## Qué hacer si da blocked

- No hacer commit.
- No hacer push.
- Copiar salida/reporte a ChatGPT.
- Corregir solo el bloque indicado por `blockers`.

## Estado

Validador post-runner creado. Pendiente ejecución local después del runner P0.