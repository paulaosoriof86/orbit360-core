param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = "Stop"
$ExpectedBranch = "ays/backend-tenant-lab-v99-20260703"
$Reports = Join-Path $Repo "_orbit360_reports"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Report = Join-Path $Reports "RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-WRAPPER-$Stamp.txt"

function Add-Report([string]$Text) { Add-Content -Path $Report -Value $Text -Encoding UTF8 }

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $Report -Value "============================================================" -Encoding UTF8
Add-Report "ORBIT 360 - RESUMEN EJECUTIVO IMPORTACION A&S v1.104"
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
  if ($Branch -ne $ExpectedBranch) { throw "Rama incorrecta. Cambia a $ExpectedBranch antes de generar resumen." }

  $Script = Join-Path $Repo "tools\orbit360-resumen-ejecutivo-importacion-ays-v104.mjs"
  if (-not (Test-Path $Script)) { throw "Falta resumen ejecutivo: $Script" }
  node $Script --reports $Reports | ForEach-Object { Add-Report $_ }
  $Code = $LASTEXITCODE
  Add-Report "ExitCode resumen ejecutivo: $Code"
  if ($Code -ne 0) { Add-Report "Resumen indica que NO se debe autorizar escritura LAB todavia." }

  $LatestMd = Get-ChildItem -Path $Reports -Filter "RESUMEN-EJECUTIVO-IMPORTACION-AYS-V104-*.md" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($LatestMd) { Add-Report "Resumen Markdown mas reciente: $($LatestMd.FullName)" }
  Add-Report ""
  Add-Report "RESULTADO: RESUMEN_EJECUTIVO_GENERADO"
} catch {
  Add-Report "ERROR GENERAL: $($_.Exception.Message)"
} finally {
  Add-Report ""
  Add-Report "Reporte wrapper: $Report"
  Add-Report "Restricciones respetadas: NO deploy, NO produccion, NO Firestore write, NO secretos, NO datos reales en repo, NO commit, NO push."
  try { Get-Content $Report -Raw -Encoding UTF8 | Set-Clipboard; notepad $Report } catch {}
}
