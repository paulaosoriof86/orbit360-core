param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$requiredBranch = 'ays/backend-tenant-lab-v99-20260703'
$index = Join-Path $Repo 'orbit360-platform\index.html'

Write-Host '============================================================'
Write-Host 'ORBIT 360 - INTEGRACION SEGURA V1.215 + CRM OP-1 + ASEGURADORAS OP-2 V1.218'
Write-Host ('Fecha local: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ('Rama obligatoria: ' + $requiredBranch)
Write-Host 'Cuentas visibles a usuarios del directorio | Credenciales: Admin/Operativo'
Write-Host 'Sin deploy | Sin merge | Sin main | Sin datos reales'
Write-Host '============================================================'

if (-not (Test-Path $index)) { throw "No se encontró index.html en: $index" }
$branch = (& git -C $Repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne $requiredBranch) {
  throw "Rama incorrecta. Actual: '$branch'. Requerida: '$requiredBranch'."
}

$replacements = @(
  @{ Before = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260711'; After = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260712-v1215' },
  @{ Before = 'modules/calidad.js?v1360'; After = 'modules/calidad.js?v=20260712-op1' }
)

$insertions = @(
  @{ Anchor = '<link rel="stylesheet" href="styles/v1197-empalme.css?v=20260711">'; Value = '<link rel="stylesheet" href="styles/crm-op1-v1216.css?v=20260712-op1">' },
  @{ Anchor = '<link rel="stylesheet" href="styles/v1197-empalme.css?v=20260711">'; Value = '<link rel="stylesheet" href="styles/aseguradoras-op2-v1217.css?v=20260713-op2-v1218">' },

  # Mismo ancla: el último valor de esta subsecuencia queda más cerca del ancla.
  @{ Anchor = '<script src="core/access-scope.js?v=20260711"></script>'; Value = '<script src="core/aseguradoras-op2-operational-access-policy.js?v=20260713-op2-v1218"></script>' },
  @{ Anchor = '<script src="core/access-scope.js?v=20260711"></script>'; Value = '<script src="core/aseguradoras-op2-role-visibility.js?v=20260713-op2"></script>' },
  @{ Anchor = '<script src="core/access-scope.js?v=20260711"></script>'; Value = '<script src="core/crm-op1-role-visibility.js?v=20260712-op1"></script>' },

  @{ Anchor = '<script src="core/insurer-directory-import-v1202-security.js?v=20260711"></script>'; Value = '<script src="core/aseguradoras-op2-import-ui-guard.js?v=20260713-op2"></script>' },
  @{ Anchor = '<script src="core/insurer-directory-import-v1202-security.js?v=20260711"></script>'; Value = '<script src="core/aseguradoras-op2-source-guard.js?v=20260713-op2"></script>' },

  @{ Anchor = '<script src="data/academia-v1203-cotizador-comparativo.js?v=20260711"></script>'; Value = '<script src="data/academia-v1216-crm-portal-poliza.js?v=20260712-op1"></script>' },
  @{ Anchor = '<script src="data/academia-v1202-directorios-aseguradoras.js?v=20260711"></script>'; Value = '<script src="data/academia-v1217-aseguradoras-op2.js?v=20260713-op2-v1218"></script>' },
  @{ Anchor = '<script src="modules/portal-v1198-scope-viewer-bridge.js?v=20260711"></script>'; Value = '<script src="modules/crm-op1-closure-bridge.js?v=20260712-op1"></script>' },

  # Orden final requerido tras el ancla: closure -> permission -> operational-resources.
  @{ Anchor = '<script src="modules/aseguradoras-v1202-resources-bridge.js?v=20260711"></script>'; Value = '<script src="modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1218"></script>' },
  @{ Anchor = '<script src="modules/aseguradoras-v1202-resources-bridge.js?v=20260711"></script>'; Value = '<script src="modules/aseguradoras-op2-permission-guard.js?v=20260713-op2"></script>' },
  @{ Anchor = '<script src="modules/aseguradoras-v1202-resources-bridge.js?v=20260711"></script>'; Value = '<script src="modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2-v1218"></script>' }
)

$text = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
$needsChange = $false
foreach ($item in $replacements) {
  $oldCount = ([regex]::Matches($text, [regex]::Escape($item.Before))).Count
  $newCount = ([regex]::Matches($text, [regex]::Escape($item.After))).Count
  if ($newCount -eq 1 -and $oldCount -eq 0) { continue }
  if ($oldCount -ne 1) { throw "Precondición bloqueada para '$($item.Before)': se esperaba 1 referencia y se encontraron $oldCount." }
  $needsChange = $true
}
foreach ($item in $insertions) {
  $valueCount = ([regex]::Matches($text, [regex]::Escape($item.Value))).Count
  if ($valueCount -eq 1) { continue }
  if ($valueCount -gt 1) { throw "Referencia duplicada: '$($item.Value)' aparece $valueCount veces." }
  $anchorCount = ([regex]::Matches($text, [regex]::Escape($item.Anchor))).Count
  if ($anchorCount -ne 1) { throw "Precondición bloqueada: el ancla '$($item.Anchor)' aparece $anchorCount veces." }
  $needsChange = $true
}

if (-not $needsChange) {
  Write-Host 'OK: integración acumulada CRM OP-1 / Aseguradoras OP-2 v1.218 ya aplicada.'
  exit 0
}

$backupDir = Join-Path $Repo ('_backups\integracion-op1-op2-v1218-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item $index (Join-Path $backupDir 'index.html') -Force

$updated = $text
foreach ($item in $replacements) { $updated = $updated.Replace($item.Before, $item.After) }
foreach ($item in $insertions) {
  if (-not $updated.Contains($item.Value)) { $updated = $updated.Replace($item.Anchor, $item.Anchor + $item.Value) }
}
[System.IO.File]::WriteAllText($index, $updated, [System.Text.UTF8Encoding]::new($false))

$verify = [System.IO.File]::ReadAllText($index, [System.Text.UTF8Encoding]::new($false))
foreach ($item in $replacements) {
  if (([regex]::Matches($verify, [regex]::Escape($item.After))).Count -ne 1) {
    Copy-Item (Join-Path $backupDir 'index.html') $index -Force
    throw "Falló la verificación de '$($item.After)'; index.html fue restaurado."
  }
}
foreach ($item in $insertions) {
  if (([regex]::Matches($verify, [regex]::Escape($item.Value))).Count -ne 1) {
    Copy-Item (Join-Path $backupDir 'index.html') $index -Force
    throw "Falló la inserción de '$($item.Value)'; index.html fue restaurado."
  }
}

$sourcePos = $verify.IndexOf('core/aseguradoras-op2-source-guard.js?v=20260713-op2')
$uiPos = $verify.IndexOf('core/aseguradoras-op2-import-ui-guard.js?v=20260713-op2')
$closurePos = $verify.IndexOf('modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2-v1218')
$permissionPos = $verify.IndexOf('modules/aseguradoras-op2-permission-guard.js?v=20260713-op2')
$operationalPos = $verify.IndexOf('modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1218')
if ($sourcePos -lt 0 -or $uiPos -lt 0 -or $sourcePos -gt $uiPos) {
  Copy-Item (Join-Path $backupDir 'index.html') $index -Force
  throw 'Orden inválido: source-guard debe cargar antes de import-ui-guard. Index restaurado.'
}
if ($closurePos -lt 0 -or $permissionPos -lt 0 -or $operationalPos -lt 0 -or -not ($closurePos -lt $permissionPos -and $permissionPos -lt $operationalPos)) {
  Copy-Item (Join-Path $backupDir 'index.html') $index -Force
  throw 'Orden inválido: closure -> permission -> operational-resources. Index restaurado.'
}

Write-Host ('Backup: ' + $backupDir)
Write-Host 'OK: cuentas visibles para usuarios del directorio; credenciales restringidas a Admin/Operativo.'
Write-Host 'No commit. No push. No deploy.'
