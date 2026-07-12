param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$requiredBranch = 'ays/backend-tenant-lab-v99-20260703'
$index = Join-Path $Repo 'orbit360-platform\index.html'

Write-Host '============================================================'
Write-Host 'ORBIT 360 - CACHE-BUST SEGURO EMPALME V1.215 + CRM OP-1'
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

$replacements = @(
  @{
    Before = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260711'
    After  = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260712-v1215'
  },
  @{
    Before = 'modules/calidad.js?v1360'
    After  = 'modules/calidad.js?v=20260712-op1'
  }
)

$text = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
$needsChange = $false
foreach ($item in $replacements) {
  $oldCount = ([regex]::Matches($text, [regex]::Escape($item.Before))).Count
  $newCount = ([regex]::Matches($text, [regex]::Escape($item.After))).Count
  if ($newCount -eq 1 -and $oldCount -eq 0) { continue }
  if ($oldCount -ne 1) {
    throw "Precondición bloqueada para '$($item.Before)': se esperaba 1 referencia y se encontraron $oldCount."
  }
  $needsChange = $true
}

if (-not $needsChange) {
  Write-Host 'OK: cache-bust v1.215/OP-1 ya aplicado.'
  exit 0
}

$backupDir = Join-Path $Repo ('_backups\cachebust-v1215-op1-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $index (Join-Path $backupDir 'index.html') -Force

$updated = $text
foreach ($item in $replacements) {
  $updated = $updated.Replace($item.Before, $item.After)
}
[System.IO.File]::WriteAllText($index, $updated, [System.Text.UTF8Encoding]::new($false))

$verify = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
foreach ($item in $replacements) {
  if (([regex]::Matches($verify, [regex]::Escape($item.After))).Count -ne 1) {
    Copy-Item (Join-Path $backupDir 'index.html') $index -Force
    throw "Falló la verificación de '$($item.After)'; index.html fue restaurado desde backup."
  }
}

Write-Host ('Backup: ' + $backupDir)
Write-Host 'OK: cache-bust actualizado para contrato v1.215 y Calidad OP-1.'
Write-Host 'No commit. No push. No deploy.'
