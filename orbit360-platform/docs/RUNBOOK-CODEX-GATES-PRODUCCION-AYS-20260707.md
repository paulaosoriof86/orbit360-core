# Runbook Codex/local — Gates producción A&S — 2026-07-07

Uso: ejecutar validaciones reales antes de marcar PR #5 como release candidate.

## Restricciones

- No merge.
- No deploy sin autorización explícita de Paula.
- No subir secretos.
- No cargar datos reales.
- No reemplazar backend protegido.
- No copiar index de ZIP Claude.

## Repo y rama

```powershell
cd C:\ruta\orbit360-core
git fetch origin
git checkout ays/backend-tenant-lab-v99-20260703
git pull --ff-only origin ays/backend-tenant-lab-v99-20260703
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
```

Debe estar limpio o solo con reportes locales no versionados.

## Validación JS

```powershell
$ErrorActionPreference = 'Stop'
$files = Get-ChildItem orbit360-platform -Recurse -Include *.js | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
$fail = @()
foreach ($f in $files) {
  node --check $f.FullName
  if ($LASTEXITCODE -ne 0) { $fail += $f.FullName }
}
if ($fail.Count -gt 0) { throw "JS CHECK FAIL: $($fail -join ', ')" }
"JS CHECK PASS: $($files.Count) archivos"
```

## Validación backend LAB

```powershell
node tools/orbit360-validar-backend-lab-contrato.mjs
if ($LASTEXITCODE -ne 0) { throw 'BACKEND LAB CONTRATO FAIL' }
```

## Runner local existente

```powershell
powershell -ExecutionPolicy Bypass -File tools/orbit360-run-flujo-ays-lab-v99.ps1
if ($LASTEXITCODE -ne 0) { throw 'RUN FLUJO AYS LAB FAIL' }
```

## Smoke visual mínimo

Validar en navegador:

- Inicio.
- Configuración.
- Clientes.
- Pólizas.
- Cobros.
- Conciliaciones.
- Finanzas.
- Documentos.
- Portal.
- Academia.

Criterio PASS:

- sin pantalla blanca;
- sin loop;
- sin errores bloqueantes de consola;
- sin textos técnicos visibles al cliente;
- sin promesas falsas de backend productivo;
- sin datos reales en demo.

## Búsqueda de textos prohibidos visibles

Revisar especialmente UI cliente para:

```txt
Firestore activo
backend productivo
pago aplicado
cobro aplicado
Todo cuadra
mock
demo
smoke
localStorage
credenciales
```

No bloquear si aparecen solo en docs técnicas internas.

## Resultado que debe reportar Codex

```txt
GATE 1 rama/PR: PASS/FAIL
GATE 2 archivos protegidos: PASS/FAIL
GATE 3 JS check: PASS/FAIL
GATE 4 backend LAB contrato: PASS/FAIL
GATE 5 runner local: PASS/FAIL
GATE 6 smoke visual: PASS/FAIL
GATE 7 textos honestos: PASS/FAIL
GATE 8 datos reales/secretos: PASS/FAIL
GATE 9 Academia impacto: PASS/FAIL
Conclusión: Release candidate SI/NO
Bloqueos exactos:
Archivos afectados:
Capturas o errores:
```

## Si todo pasa

No desplegar automáticamente. Reportar a Paula y esperar autorización explícita para:

1. marcar PR ready;
2. merge controlado;
3. deploy controlado;
4. smoke post-deploy;
5. rollback si falla.
