param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RUN-OPERACION-OP1-OP2-$Stamp.txt"

function Add-Report([string]$Text = '') { Add-Content -Path $MasterReport -Value $Text -Encoding UTF8 }
function Run-Step([string]$Name, [scriptblock]$Block) {
  Add-Report ''; Add-Report "== $Name =="
  try { & $Block; Add-Report "OK: $Name"; return $true }
  catch { Add-Report ("ERROR: {0}" -f $_.Exception.Message); return $false }
}
function Clear-OrbitPort5000 {
  $listeners = @()
  try { $listeners = @(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) } catch {}
  if (-not $listeners.Count) { return }
  $ownerPids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($pidValue in $ownerPids) {
    $proc = $null
    try { $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction Stop } catch {}
    $cmd = if ($proc) { [string]$proc.CommandLine } else { '' }
    $name = if ($proc) { [string]$proc.Name } else { "PID $pidValue" }
    $identity = "$name $cmd"
    Add-Report "Puerto 5000 ocupado por $name · PID $pidValue"
    Add-Report "Comando detectado: $cmd"
    if ($identity -match '(?i)(orbit360|firebase\s+(serve|emulators)|http-server|serve\s+.*orbit360-platform|smoke-visual-(crm-op1|aseguradoras-op2))') {
      Stop-Process -Id $pidValue -Force -ErrorAction Stop
      Add-Report "Servidor local Orbit conocido detenido de forma controlada: PID $pidValue"
    } else {
      throw "El puerto 5000 pertenece a otra aplicación. No se cerró: $name (PID $pidValue)."
    }
  }
  Start-Sleep -Milliseconds 700
}
function Run-NodeValidator([string]$RelativePath, [string[]]$Arguments = @()) {
  $File = Join-Path $Repo $RelativePath
  if (-not (Test-Path $File)) { throw "Falta: $File" }
  & node $File @Arguments 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw "Falló: $RelativePath" }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - RUN COMUN OPERACION CRM OP-1 + ASEGURADORAS OP-2 V1.218'
Add-Report ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report ("Rama obligatoria: {0}" -f $ExpectedBranch)
Add-Report 'URL de validación: http://localhost:5000'
Add-Report 'Cuentas: todos los usuarios del directorio. Credenciales: Dirección/Admin/Operativo.'
Add-Report 'Modo: demo/ficticio. Sin deploy, producción, main, secretos, datos reales, commit o push automáticos.'
Add-Report '============================================================'

$AllOk = $true
$App = Join-Path $Repo 'orbit360-platform'

$AllOk = (Run-Step '1. Verificar repositorio y rama obligatoria' {
  if (-not (Test-Path $Repo)) { throw "No existe el repositorio: $Repo" }
  Set-Location $Repo
  $Branch = (& git branch --show-current).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Requerida: $ExpectedBranch" }
  $Status = git status --short
  if ($Status) {
    Add-Report 'Cambios locales detectados; no se descartan ni sobrescriben:'
    $Status | ForEach-Object { Add-Report $_ }
  }
}) -and $AllOk

$AllOk = (Run-Step '2. Sincronizar mediante fast-forward seguro' {
  Set-Location $Repo
  & git fetch origin $ExpectedBranch 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló git fetch.' }
  & git pull --ff-only origin $ExpectedBranch 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Git bloqueó el fast-forward. No se forzó ni descartó nada.' }
  Add-Report ("HEAD sincronizado: {0}" -f ((& git rev-parse HEAD).Trim()))
}) -and $AllOk

$AllOk = (Run-Step '3. Integrar CRM OP-1 y Aseguradoras OP-2 v1.218 con backup' {
  $Script = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
  if (-not (Test-Path $Script)) { throw "Falta: $Script" }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló la integración segura del index.' }
}) -and $AllOk

$AllOk = (Run-Step '4. Validar backend protegido' {
  Run-NodeValidator 'tools\orbit360-validar-backend-lab-contrato.mjs'
}) -and $AllOk

$AllOk = (Run-Step '5. Validar CRM OP-1' {
  Run-NodeValidator 'tools\orbit360-validar-crm-op1.mjs' @($App)
}) -and $AllOk

$AllOk = (Run-Step '6. Validar Cotizador y Comparativo empalmados' {
  Run-NodeValidator 'tools\orbit360-validar-cierre-cotizador-comparativo-v1215.mjs' @($App)
}) -and $AllOk

$AllOk = (Run-Step '7. Validar Aseguradoras OP-2 general' {
  Run-NodeValidator 'tools\orbit360-validar-aseguradoras-op2.mjs' @($App)
}) -and $AllOk

$AllOk = (Run-Step '8. Validar política de cuentas y credenciales v1.218' {
  Run-NodeValidator 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs' @($App)
}) -and $AllOk

if ($AllOk) {
  $AllOk = (Run-Step '9. Preparar localhost:5000 de forma segura' { Clear-OrbitPort5000 }) -and $AllOk
}

if ($AllOk) {
  $AllOk = (Run-Step '10. Ejecutar matriz visual CRM OP-1' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-crm-op1.mjs'
    & node $Smoke --repo $Repo --app $App --port 5000 2>&1 | ForEach-Object { Add-Report $_ }
    if ($LASTEXITCODE -ne 0) { throw 'CRM OP-1 quedó bloqueado en uno o más escenarios.' }
  }) -and $AllOk
}

if ($AllOk) {
  $AllOk = (Run-Step '11. Liberar nuevamente localhost:5000' { Clear-OrbitPort5000 }) -and $AllOk
}

if ($AllOk) {
  $AllOk = (Run-Step '12. Ejecutar matriz visual Aseguradoras OP-2 v1.218' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-aseguradoras-op2.mjs'
    & node $Smoke --repo $Repo --app $App --port 5000 2>&1 | ForEach-Object { Add-Report $_ }
    if ($LASTEXITCODE -ne 0) { throw 'Aseguradoras OP-2 quedó bloqueado en uno o más escenarios.' }
  }) -and $AllOk
}

Run-Step '13. Estado Git y evidencias' {
  Set-Location $Repo
  Add-Report ("Rama final: {0}" -f ((& git branch --show-current).Trim()))
  Add-Report ("HEAD final: {0}" -f ((& git rev-parse HEAD).Trim()))
  $Status = git status --short
  if ($Status) {
    Add-Report 'Cambios locales posteriores esperados por integración/reportes:'
    $Status | ForEach-Object { Add-Report $_ }
  } else { Add-Report 'Sin cambios locales.' }
  Add-Report 'Carpetas de capturas más recientes:'
  Get-ChildItem $Reports -Directory -Filter 'VISUAL-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 4 |
    ForEach-Object { Add-Report $_.FullName }
} | Out-Null

Add-Report ''
if ($AllOk) {
  Add-Report 'RESULTADO OPERACION OP1+OP2: VALIDACION AUTOMATICA APROBADA'
  Add-Report 'Pendiente final: revisión humana de las capturas antes de declarar ambos módulos cerrados.'
  Add-Report 'Los dry-runs reales GT/CO no se ejecutan en este bloque.'
} else {
  Add-Report 'RESULTADO OPERACION OP1+OP2: BLOQUEADO_O_CON_ERRORES'
  Add-Report 'No avanzar a datos reales ni al siguiente módulo hasta corregir P0/P1 del reporte.'
}
Add-Report 'Restricciones respetadas: no deploy, producción, merge, main, secretos, datos reales, commit ni push automático.'
Add-Report ("Reporte maestro: {0}" -f $MasterReport)

try {
  Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
  notepad $MasterReport
} catch {}
if (-not $AllOk) { exit 1 }
