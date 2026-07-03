param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core",
  [string]$ProjectId = ""
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "SMOKE-POST-CARGA-AYS-LAB-V104-WRAPPER-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - SMOKE POST CARGA A&S LAB v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: SOLO LECTURA, NO deploy, NO produccion, NO Firestore write, NO secretos en repo"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Debe ser $ExpectedBranch." }
  if (-not $ProjectId) { $ProjectId = $env:FIREBASE_PROJECT_ID }
  if (-not $ProjectId) { throw "Falta -ProjectId o FIREBASE_PROJECT_ID." }
  if (-not $env:GOOGLE_APPLICATION_CREDENTIALS) { throw "Falta GOOGLE_APPLICATION_CREDENTIALS local." }
  if (-not (Test-Path $env:GOOGLE_APPLICATION_CREDENTIALS)) { throw "GOOGLE_APPLICATION_CREDENTIALS no apunta a archivo existente." }

  $Smoke = Join-Path $Repo "tools\orbit360-smoke-post-carga-ays-lab-v104.mjs"
  if (-not (Test-Path $Smoke)) { throw "Falta smoke: $Smoke" }
  node $Smoke --tenant alianzas-soluciones --project $ProjectId | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode smoke post carga: $Code"
  if ($Code -ne 0) { throw "Smoke post carga fallo." }

  Add-Report ""
  Add-Report "RESULTADO: SMOKE_POST_CARGA_OK"
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: SOLO LECTURA, NO deploy, NO produccion, NO Firestore write, NO secretos en repo."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
