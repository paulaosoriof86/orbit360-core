param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Exports = Join-Path $Repo "_orbit360_exports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "PRIMER-ENSAYO-IMPORTACION-AYS-V104-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }
function Run-Step([string]$Name, [scriptblock]$Block) {
  Add-Report ""
  Add-Report "== $Name =="
  try { & $Block; Add-Report "OK: $Name"; return $true }
  catch { Add-Report ("ERROR en {0}: {1}" -f $Name, $_.Exception.Message); return $false }
}

New-Item -ItemType Directory -Force -Path $Reports, $Exports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - PRIMER ENSAYO IMPORTACION A&S v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama obligatoria: $ExpectedBranch"
Add-Report "Restricciones: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push"
Add-Report "============================================================"

$AllOk = $true
$LatestPayload = $null

$AllOk = (Run-Step "1. Verificar repo y rama" {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  git fetch origin $ExpectedBranch | ForEach-Object { Add-Report $_ }
  git checkout $ExpectedBranch | ForEach-Object { Add-Report $_ }
  git pull --ff-only origin $ExpectedBranch | ForEach-Object { Add-Report $_ }
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $Head = (git rev-parse HEAD).Trim()
  Add-Report "Rama: $Branch"
  Add-Report "HEAD: $Head"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta." }
}) -and $AllOk

$AllOk = (Run-Step "2. Preparar carpetas y plantillas locales" {
  $Script = Join-Path $Repo "tools\orbit360-preparar-importacion-ays-v104.ps1"
  if (-not (Test-Path $Script)) { throw "Falta script: $Script" }
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Script -Repo $Repo | ForEach-Object { Add-Report $_ }
}) -and $AllOk

$AllOk = (Run-Step "3. Validar estructura archivos reales locales" {
  Set-Location $Repo
  $Validator = Join-Path $Repo "tools\orbit360-validar-importacion-ays-v104.mjs"
  if (-not (Test-Path $Validator)) { throw "Falta validador: $Validator" }
  $ImportDir = Join-Path $Repo "_orbit360_imports\ays_real"
  node $Validator $ImportDir | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw "Validador importacion fallo." }
}) -and $AllOk

$AllOk = (Run-Step "4. Generar payload dry-run sin escritura" {
  Set-Location $Repo
  $Loader = Join-Path $Repo "tools\orbit360-cargar-importacion-ays-lab-v104.mjs"
  if (-not (Test-Path $Loader)) { throw "Falta cargador: $Loader" }
  $ImportDir = Join-Path $Repo "_orbit360_imports\ays_real"
  node $Loader --input $ImportDir --tenant alianzas-soluciones | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw "Dry-run importacion fallo." }
}) -and $AllOk

$AllOk = (Run-Step "5. Listar lotes locales generados" {
  Set-Location $Repo
  $Lister = Join-Path $Repo "tools\orbit360-listar-lotes-importacion-ays-v104.mjs"
  if (-not (Test-Path $Lister)) { throw "Falta listador: $Lister" }
  node $Lister $Exports | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw "Listador de lotes fallo." }
  $LatestPayload = Get-ChildItem -Path $Exports -Filter "payload-importacion-ays-lab-v104-*.json" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($LatestPayload) { Add-Report "Payload mas reciente: $($LatestPayload.FullName)" }
  else { Add-Report "ADVERTENCIA: no se encontro payload para rollback dry-run." }
}) -and $AllOk

$AllOk = (Run-Step "6. Rollback dry-run desde payload mas reciente" {
  if (-not $LatestPayload) { Add-Report "Sin payload: paso omitido sin error."; return }
  Set-Location $Repo
  $Rollback = Join-Path $Repo "tools\orbit360-rollback-importacion-ays-lab-v104.mjs"
  if (-not (Test-Path $Rollback)) { throw "Falta rollback: $Rollback" }
  node $Rollback --payload $LatestPayload.FullName --tenant alianzas-soluciones | ForEach-Object { Add-Report $_ }
  if ($LASTEXITCODE -ne 0) { throw "Rollback dry-run fallo." }
}) -and $AllOk

Run-Step "7. Estado Git posterior" {
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama final: $Branch"
  $Status = (git status --short)
  if ($Status) {
    Add-Report "Cambios locales despues del ensayo:"
    $Status | ForEach-Object { Add-Report $_ }
    Add-Report "Nota: cambios esperados solo en carpetas ignoradas (_orbit360_imports/_exports/_reports) si hay archivos locales."
  } else {
    Add-Report "Sin cambios locales."
  }
}

Add-Report ""
if ($AllOk) {
  Add-Report "RESULTADO PRIMER ENSAYO IMPORTACION A&S V104: EJECUTADO_SIN_ESCRITURA"
  Add-Report "Siguiente paso: revisar reportes y, si todo esta correcto, solicitar autorizacion explicita para escribir en Firestore LAB."
} else {
  Add-Report "RESULTADO PRIMER ENSAYO IMPORTACION A&S V104: BLOQUEADO_O_CON_ERRORES"
  Add-Report "No se escribio en Firestore, no se hizo deploy, no se hizo commit y no se hizo push."
}

Add-Report ""
Add-Report "Reporte maestro: $Report"
Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push."
try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
