# Guía de ejecución local — runner hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Objetivo

Dar a Paula una ejecución local simple, en un solo bloque, con mínima carga manual.

## Condiciones antes de ejecutar

Debe ejecutarse únicamente en el repo correcto:

```txt
paulaosoriof86/orbit360-core
```

y en la rama:

```txt
ays/backend-tenant-lab-v99-20260703
```

No ejecutar en `main` ni en ramas de prototipo/Claude.

## Comando único principal

Desde PowerShell, parada en la raíz del repo:

```powershell
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Comando recomendado con copia al portapapeles

Este bloque ejecuta el runner, guarda salida visible y copia el resultado al portapapeles para compartirlo después:

```powershell
$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$out = "_orbit360_reports\salida_runner_hotfixes_p0_v1330_$ts.txt"
New-Item -ItemType Directory -Force -Path "_orbit360_reports" | Out-Null
node orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs 2>&1 | Tee-Object -FilePath $out
Get-Content $out -Raw | Set-Clipboard
Write-Host "Salida copiada al portapapeles: $out" -ForegroundColor Green
```

## Qué debe devolver

Resultado esperado:

```txt
ok: true
status: ok
branch: ays/backend-tenant-lab-v99-20260703
forbidden: []
protectedChanges: []
```

## Qué hacer si sale OK

1. Copiar el JSON/reporte a ChatGPT.
2. Revisar el reporte generado en `_orbit360_reports/`.
3. Preparar commit local controlado de los módulos corregidos.
4. No hacer deploy.
5. No hacer merge.
6. No tocar main.

## Qué hacer si falla

1. No hacer commit.
2. No hacer push.
3. No hacer deploy.
4. Copiar salida completa a ChatGPT.
5. Corregir solo el bloque fallido.

## Archivos que pueden quedar modificados si todo sale OK

```txt
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
orbit360-platform/modules/portal.js
orbit360-platform/modules/configuracion.js
orbit360-platform/modules/equipo.js
orbit360-platform/data/academia-plus.js
```

## Archivos que NO deben quedar modificados

```txt
orbit360-platform/index.html
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
```

## Estado

Guía lista para ejecución local cuando Paula esté en computador.