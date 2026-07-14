param(
  [string]$Repo = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$RequiredBranch = 'ays/backend-tenant-lab-v99-20260703'
$IndexPath = Join-Path $Repo 'orbit360-platform\index.html'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Count-Exact([string]$Text, [string]$Value) {
  return ([regex]::Matches($Text, [regex]::Escape($Value))).Count
}

Write-Host '============================================================'
Write-Host 'ORBIT 360 - SAFE INTEGRATION CRM OP1 + INSURERS OP2 V1.223'
Write-Host ('Local time: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ('Required branch: ' + $RequiredBranch)
Write-Host 'No deploy | No merge | No main | No real data'
Write-Host '============================================================'

if (-not (Test-Path $IndexPath)) { throw "index.html not found: $IndexPath" }
$Branch = (& git -C $Repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne $RequiredBranch) {
  throw "Wrong branch. Current: '$Branch'. Required: '$RequiredBranch'."
}

$ExactReplacements = @(
  @{
    Old = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260711'
    New = 'core/quote-comparison-contracts-v1203-refinements.js?v=20260712-v1215'
    Required = $true
  },
  @{
    Old = 'modules/calidad.js?v1360'
    New = 'modules/calidad.js?v=20260712-op1'
    Required = $true
  },
  @{
    Old = '<link rel="stylesheet" href="styles/aseguradoras-op2-v1217.css?v=20260713-op2">'
    New = '<link rel="stylesheet" href="styles/aseguradoras-op2-v1217.css?v=20260713-op2-v1218">'
    Required = $false
  },
  @{
    Old = '<script src="data/academia-v1217-aseguradoras-op2.js?v=20260713-op2"></script>'
    New = '<script src="data/academia-v1217-aseguradoras-op2.js?v=20260713-op2-v1218"></script>'
    Required = $false
  },
  @{
    Old = '<script src="modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2"></script>'
    New = '<script src="modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2-v1218"></script>'
    Required = $false
  },
  @{
    Old = '<script src="modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1218"></script>'
    New = '<script src="modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1223"></script>'
    Required = $false
  }
)

$Groups = @(
  @{
    Anchor = '<link rel="stylesheet" href="styles/v1197-empalme.css?v=20260711">'
    Values = @(
      '<link rel="stylesheet" href="styles/crm-op1-v1216.css?v=20260712-op1">',
      '<link rel="stylesheet" href="styles/aseguradoras-op2-v1217.css?v=20260713-op2-v1218">'
    )
  },
  @{
    Anchor = '<script src="core/access-scope.js?v=20260711"></script>'
    Values = @(
      '<script src="core/crm-op1-role-visibility.js?v=20260712-op1"></script>',
      '<script src="core/aseguradoras-op2-role-visibility.js?v=20260713-op2"></script>',
      '<script src="core/aseguradoras-op2-operational-access-policy.js?v=20260713-op2-v1218"></script>',
      '<script src="core/aseguradoras-op2-secure-provider-policy-guard.js?v=20260713-op2-v1218"></script>'
    )
  },
  @{
    Anchor = '<script src="core/insurer-directory-import-v1202-security.js?v=20260711"></script>'
    Values = @(
      '<script src="core/aseguradoras-op2-sheet-quarantine.js?v=20260713-op2-v1219"></script>',
      '<script src="core/aseguradoras-op2-source-guard.js?v=20260713-op2"></script>',
      '<script src="core/aseguradoras-op2-import-ui-guard.js?v=20260713-op2"></script>'
    )
  },
  @{
    Anchor = '<script src="data/academia-v1203-cotizador-comparativo.js?v=20260711"></script>'
    Values = @(
      '<script src="data/academia-v1216-crm-portal-poliza.js?v=20260712-op1"></script>'
    )
  },
  @{
    Anchor = '<script src="data/academia-v1202-directorios-aseguradoras.js?v=20260711"></script>'
    Values = @(
      '<script src="data/academia-v1217-aseguradoras-op2.js?v=20260713-op2-v1218"></script>'
    )
  },
  @{
    Anchor = '<script src="modules/portal-v1198-scope-viewer-bridge.js?v=20260711"></script>'
    Values = @(
      '<script src="modules/crm-op1-closure-bridge.js?v=20260712-op1"></script>'
    )
  },
  @{
    Anchor = '<script src="modules/aseguradoras-v1202-resources-bridge.js?v=20260711"></script>'
    Values = @(
      '<script src="modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2-v1218"></script>',
      '<script src="modules/aseguradoras-op2-permission-guard.js?v=20260713-op2"></script>',
      '<script src="modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1223"></script>'
    )
  }
)

$Original = [System.IO.File]::ReadAllText($IndexPath, $Utf8NoBom)
$Updated = $Original

foreach ($Item in $ExactReplacements) {
  $OldCount = Count-Exact $Updated $Item.Old
  $NewCount = Count-Exact $Updated $Item.New

  if ($OldCount -gt 1 -or $NewCount -gt 1) {
    throw "Duplicate reference detected for '$($Item.Old)' / '$($Item.New)'."
  }
  if ($OldCount -eq 1 -and $NewCount -eq 1) {
    throw "Old and new references coexist: '$($Item.Old)' / '$($Item.New)'."
  }
  if ($OldCount -eq 1) {
    $Updated = $Updated.Replace($Item.Old, $Item.New)
    continue
  }
  if ($NewCount -eq 1) { continue }
  if ($Item.Required) {
    throw "Required reference not found: '$($Item.Old)' or '$($Item.New)'."
  }
}

foreach ($Group in $Groups) {
  if ((Count-Exact $Updated $Group.Anchor) -ne 1) {
    throw "Anchor must appear exactly once: '$($Group.Anchor)'."
  }
  foreach ($Value in $Group.Values) {
    if ((Count-Exact $Updated $Value) -gt 1) {
      throw "Duplicate integration reference: '$Value'."
    }
    $Updated = $Updated.Replace($Value, '')
  }
  $Block = $Group.Anchor + ($Group.Values -join '')
  $Updated = $Updated.Replace($Group.Anchor, $Block)
}

if ($Updated -eq $Original) {
  Write-Host 'OK: integration already applied exactly once.'
  exit 0
}

$BackupDir = Join-Path $Repo ('_backups\integration-op1-op2-v1223-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Copy-Item $IndexPath (Join-Path $BackupDir 'index.html') -Force

try {
  [System.IO.File]::WriteAllText($IndexPath, $Updated, $Utf8NoBom)
  $Verify = [System.IO.File]::ReadAllText($IndexPath, $Utf8NoBom)

  foreach ($Item in $ExactReplacements) {
    if ((Count-Exact $Verify $Item.New) -ne 1) {
      throw "Replacement verification failed: '$($Item.New)'."
    }
    if ((Count-Exact $Verify $Item.Old) -ne 0) {
      throw "Old exact reference remains: '$($Item.Old)'."
    }
  }

  foreach ($Group in $Groups) {
    foreach ($Value in $Group.Values) {
      if ((Count-Exact $Verify $Value) -ne 1) {
        throw "Insertion verification failed: '$Value'."
      }
    }
  }

  $QuarantinePos = $Verify.IndexOf('core/aseguradoras-op2-sheet-quarantine.js?v=20260713-op2-v1219')
  $SourcePos = $Verify.IndexOf('core/aseguradoras-op2-source-guard.js?v=20260713-op2')
  $UiPos = $Verify.IndexOf('core/aseguradoras-op2-import-ui-guard.js?v=20260713-op2')
  $AccessPos = $Verify.IndexOf('core/aseguradoras-op2-operational-access-policy.js?v=20260713-op2-v1218')
  $ProviderPos = $Verify.IndexOf('core/aseguradoras-op2-secure-provider-policy-guard.js?v=20260713-op2-v1218')
  $ClosurePos = $Verify.IndexOf('modules/aseguradoras-op2-closure-bridge.js?v=20260713-op2-v1218')
  $PermissionPos = $Verify.IndexOf('modules/aseguradoras-op2-permission-guard.js?v=20260713-op2')
  $OperationalPos = $Verify.IndexOf('modules/aseguradoras-op2-operational-resources.js?v=20260713-op2-v1223')

  if (-not ($QuarantinePos -ge 0 -and $SourcePos -gt $QuarantinePos -and $UiPos -gt $SourcePos)) {
    throw 'Invalid order: sheet quarantine -> source guard -> import UI guard.'
  }
  if (-not ($AccessPos -ge 0 -and $ProviderPos -gt $AccessPos)) {
    throw 'Invalid order: access policy must load before provider policy guard.'
  }
  if (-not ($ClosurePos -ge 0 -and $PermissionPos -gt $ClosurePos -and $OperationalPos -gt $PermissionPos)) {
    throw 'Invalid order: closure -> permission -> operational resources.'
  }
}
catch {
  Copy-Item (Join-Path $BackupDir 'index.html') $IndexPath -Force
  throw ("Integration failed and index.html was restored. " + $_.Exception.Message)
}

Write-Host ('Backup: ' + $BackupDir)
Write-Host 'OK: CRM OP1 and Insurers OP2 v1.223 integrated exactly once.'
Write-Host 'No commit. No push. No deploy.'
