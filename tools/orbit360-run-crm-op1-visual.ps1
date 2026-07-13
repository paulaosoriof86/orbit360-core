param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RUN-CRM-OP1-VISUAL-$Stamp.txt"

function Add-Report([string]$Text = '') {
  Add-Content -Path $MasterReport -Value $Text -Encoding UTF8
}
function Run-Step([string]$Name, [scriptblock]$Block) {
  Add-Report ''
  Add-Report "== $Name =="
  try {
    & $Block
    Add-Report "OK: $Name"
    return $true
  } catch {
    Add-Report ("ERROR: {0}" -f $_.Exception.Message)
    return $false
  }
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - CIERRE Y VALIDACION VISUAL CRM OP-1'
Add-Report ("Fecha local: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report ("Rama obligatoria: {0}" -f $ExpectedBranch)
Add-Report 'URL visual: http://localhost:5000'
Add-Report 'Restricciones: sin deploy, sin producción, sin main, sin secretos, sin datos reales, sin commit/push automáticos.'
Add-Report '============================================================'

$AllOk = $true

$AllOk = (Run-Step '1. Verificar repositorio y rama' {
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

$AllOk = (Run-Step '2. Sincronizar rama mediante fast-forward seguro' {
  Set-Location $Repo
  & git fetch origin $ExpectedBranch 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló git fetch.' }
  & git pull --ff-only origin $ExpectedBranch 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Git bloqueó el fast-forward. No se forzó ni descartó nada.' }
  Add-Report ("HEAD: {0}" -f ((& git rev-parse HEAD).Trim()))
}) -and $AllOk

$AllOk = (Run-Step '3. Integrar cache-bust y puentes CRM con backup' {
  $Script = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
  if (-not (Test-Path $Script)) { throw "Falta: $Script" }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló la integración segura del index.' }
}) -and $AllOk

$AllOk = (Run-Step '4. Validar backend protegido' {
  $Validator = Join-Path $Repo 'tools\orbit360-validar-backend-lab-contrato.mjs'
  & node $Validator 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló el contrato backend protegido.' }
}) -and $AllOk

$AllOk = (Run-Step '5. Validar CRM OP-1 estáticamente' {
  $Validator = Join-Path $Repo 'tools\orbit360-validar-crm-op1.mjs'
  $App = Join-Path $Repo 'orbit360-platform'
  & node $Validator $App 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló el validador CRM OP-1.' }
}) -and $AllOk

$AllOk = (Run-Step '6. Validar Cotizador y Comparativo empalmados' {
  $Validator = Join-Path $Repo 'tools\orbit360-validar-cierre-cotizador-comparativo-v1215.mjs'
  $App = Join-Path $Repo 'orbit360-platform'
  & node $Validator $App 2>&1 | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw 'Falló el validador Cotizador/Comparativo v1.215.' }
}) -and $AllOk

if ($AllOk) {
  $AllOk = (Run-Step '7. Ejecutar smoke visual automático CRM en localhost:5000' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-crm-op1.mjs'
    if (-not (Test-Path $Smoke)) { throw "Falta: $Smoke" }
    & node $Smoke --repo $Repo --app (Join-Path $Repo 'orbit360-platform') --port 5000 2>&1 | ForEach-Object { Add-Report $_ }
    if ($LASTEXITCODE -ne 0) { throw 'Uno o más escenarios visuales quedaron bloqueados. Revisar capturas y reporte.' }
  }) -and $AllOk
}

Run-Step '8. Estado Git posterior' {
  Set-Location $Repo
  Add-Report ("Rama final: {0}" -f ((& git branch --show-current).Trim()))
  Add-Report ("HEAD final: {0}" -f ((& git rev-parse HEAD).Trim()))
  $Status = git status --short
  if ($Status) {
    Add-Report 'Cambios locales posteriores esperados por cache-bust/reportes:'
    $Status | ForEach-Object { Add-Report $_ }
  } else {
    Add-Report 'Sin cambios locales.'
  }
} | Out-Null

Add-Report ''
if ($AllOk) {
  Add-Report 'RESULTADO CRM OP-1: VALIDACION AUTOMATICA APROBADA'
  Add-Report 'Siguiente acción: revisar las capturas generadas y registrar aprobación visual humana antes de cambiar CRM a cerrado.'
} else {
  Add-Report 'RESULTADO CRM OP-1: BLOQUEADO_O_CON_ERRORES'
  Add-Report 'No avanzar a Aseguradoras hasta corregir hallazgos P0/P1 del reporte visual.'
}
Add-Report 'No se hizo deploy, producción, merge, commit ni push automático.'
Add-Report ("Reporte maestro: {0}" -f $MasterReport)

try {
  Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
  notepad $MasterReport
} catch {}

if (-not $AllOk) { exit 1 }
