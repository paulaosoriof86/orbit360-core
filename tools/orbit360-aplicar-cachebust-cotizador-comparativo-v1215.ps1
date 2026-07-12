param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$requiredBranch = 'ays/backend-tenant-lab-v99-20260703'
$index = Join-Path $Repo 'orbit360-platform\index.html'

Write-Host '============================================================'
Write-Host 'ORBIT 360 - CACHE-BUST SEGURO COTIZADOR/COMPARATIVO V1.215'
Write-Host ('Fecha local: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ('Rama obligatoria: ' + $requiredBranch)
Write-Host 'Sin deploy | Sin merge | Sin main | Sin datos reales'
Write-Host '============================================================'

if (-not (Test-Path $index)) {
  throw "No se encontró index.html en: $index"
}

$branch = (& git -C $Repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne $requiredBranch) {
  throw "Rama incorrecta. Actual: '$branch'. Requerida: '$requiredBranch'."
}

$before = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260711'
$after  = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260712-v1215'

$text = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
$countBefore = ([regex]::Matches($text, [regex]::Escape($before))).Count
$countAfter = ([regex]::Matches($text, [regex]::Escape($after))).Count

if ($countAfter -eq 1 -and $countBefore -eq 0) {
  Write-Host 'OK: cache-bust v1.215 ya aplicado.'
  exit 0
}
if ($countBefore -ne 1) {
  throw "Precondición bloqueada: se esperaba exactamente 1 referencia anterior y se encontraron $countBefore."
}

$backupDir = Join-Path $Repo ('_backups\cachebust-v1215-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $index (Join-Path $backupDir 'index.html') -Force

$updated = $text.Replace($before, $after)
[System.IO.File]::WriteAllText($index, $updated, [System.Text.UTF8Encoding]::new($false))

$verify = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
if (([regex]::Matches($verify, [regex]::Escape($after))).Count -ne 1) {
  Copy-Item (Join-Path $backupDir 'index.html') $index -Force
  throw 'Falló la verificación; index.html fue restaurado desde backup.'
}

Write-Host ('Backup: ' + $backupDir)
Write-Host 'OK: cache-bust actualizado a 20260712-v1215.'
Write-Host 'No commit. No push. No deploy.'
