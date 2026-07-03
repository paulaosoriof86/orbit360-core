param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$InputDir = Join-Path $Repo "_orbit360_imports\ays_real"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "AUDITAR-CALIDAD-DATOS-AYS-V104-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }

New-Item -ItemType Directory -Force -Path $Reports, $InputDir | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - AUDITAR CALIDAD DATOS A&S v1.104"
Add-Report "Fecha local: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Report "Repo: $Repo"
Add-Report "Rama esperada: $ExpectedBranch"
Add-Report "Restricciones: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push"
Add-Report "============================================================"

try {
  if (-not (Test-Path $Repo)) { throw "No existe repo: $Repo" }
  Set-Location $Repo
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  Add-Report "Rama actual: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Cambia a $ExpectedBranch antes de auditar." }

  $Auditor = Join-Path $Repo "tools\orbit360-auditar-calidad-datos-ays-v104.mjs"
  if (-not (Test-Path $Auditor)) { throw "Falta auditor: $Auditor" }

  node $Auditor --input $InputDir | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode auditor calidad: $Code"
  if ($Code -ne 0) { throw "Auditoria de calidad encontro errores criticos." }

  Add-Report ""
  Add-Report "RESULTADO: AUDITORIA_CALIDAD_OK"
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
