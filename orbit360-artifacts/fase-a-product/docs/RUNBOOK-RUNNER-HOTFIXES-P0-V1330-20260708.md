# Runbook — runner único hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Reducir la ejecución manual a un solo comando para aplicar y validar los cuatro hotfixes P0 post-candidata Claude v1330:

```txt
1. Cobros + Conciliaciones.
2. Portal.
3. Config + Equipo.
4. Academia post v1330.
```

## Script creado

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Comando único

Desde la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Qué hace

- Verifica la rama esperada:
  - `ays/backend-tenant-lab-v99-20260703`.
- Verifica que existan los cuatro scripts P0.
- Ejecuta en orden:
  - `APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs`.
  - `APLICAR-HOTFIX-P0-PORTAL-V1330.mjs`.
  - `APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs`.
  - `APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs`.
- Ejecuta `node --check` en:
  - `modules/cobros.js`.
  - `modules/conciliaciones.js`.
  - `modules/portal.js`.
  - `modules/configuracion.js`.
  - `modules/equipo.js`.
  - `data/academia-plus.js`.
- Busca patrones prohibidos posteriores:
  - `readAsDataURL`.
  - `base64`.
  - `factData`.
  - `ci-key`.
  - `saved.key`.
  - captura directa de `key` desde integración.
- Verifica que no haya cambios en protegidos listados.
- Ejecuta el runner agrupado si existe:
  - `tools/orbit360-run-validaciones-agrupadas-v1330.mjs`.
- Genera reporte en `_orbit360_reports/`.

## Qué no hace

- No commit.
- No push.
- No deploy.
- No merge.
- No toca producción.
- No toca Firestore directamente.
- No toca `index.html`.
- No toca backend protegido.

## Resultado esperado

JSON final con:

```txt
ok: true
status: ok
branch: ays/backend-tenant-lab-v99-20260703
syntax: code 0 en los seis archivos
forbidden: []
protectedChanges: []
reportFile: _orbit360_reports/runner_hotfixes_p0_v1330_*.md
```

## Qué hacer después de ejecutarlo

1. Revisar el JSON final.
2. Revisar el reporte generado.
3. Si `ok: true`, se puede preparar commit local del worktree con los módulos corregidos.
4. Si `ok: false`, copiar el JSON/reporte y corregir solo el bloque que falló.
5. No hacer deploy ni merge.

## Impacto Claude/prototipo

Sí aplica. Este runner consolida todas las modificaciones locales que Claude deberá conservar:

- Cobros/M5: motivo, país/moneda, no base64, no aplicación automática.
- Portal: soporte metadata-only vinculado al cobro.
- Config/Equipo: credentialRef/backend_required y gates administrativos.
- Academia: roles/permisos/auditoría y continuidad post-Claude.

## Estado

Runner único creado. Pendiente ejecución local cuando Paula esté en computador.