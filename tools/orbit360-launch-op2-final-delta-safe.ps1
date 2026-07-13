param(
  [string]$RepoPath = ''
)

$ErrorActionPreference = 'Stop'
$Branch = 'ays/backend-tenant-lab-v99-20260703'
$PreviouslyValidatedHead = '3f1bbcc675a20af059204741b0f273a57b390078'

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

function Find-OrbitRepo([string]$Requested) {
  $Candidates = @(
    $Requested,
    (Get-Location).Path,
    (Join-Path $env:USERPROFILE 'OneDrive\Documentos\GitHub\orbit360-core'),
    (Join-Path $env:USERPROFILE 'Documents\GitHub\orbit360-core'),
    (Join-Path $env:USERPROFILE 'OneDrive\Documents\GitHub\orbit360-core'),
    'C:\orbit360-core'
  )
  $Seen = @{}
  foreach ($Candidate in $Candidates) {
    if (-not $Candidate) { continue }
    try { $Full = [System.IO.Path]::GetFullPath($Candidate) } catch { continue }
    if ($Seen.ContainsKey($Full)) { continue }
    $Seen[$Full] = $true
    if (-not (Test-Path (Join-Path $Full '.git'))) { continue }
    $Origin = (& git -C $Full remote get-url origin 2>$null | Out-String).Trim()
    if ($Origin -match 'paulaosoriof86[/\\:]orbit360-core') { return $Full }
  }
  return $null
}

$Repo = Find-OrbitRepo $RepoPath
if (-not $Repo) {
  Write-Host 'BLOQUEADO: no se encontro orbit360-core. No se modifico nada.'
  exit 0
}

$CurrentBranch = (& git -C $Repo branch --show-current 2>$null | Out-String).Trim()
if ($CurrentBranch -ne $Branch) {
  Write-Host "BLOQUEADO: rama incorrecta $CurrentBranch. No se modifico nada."
  exit 0
}

& git -C $Repo fetch --quiet origin $Branch 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'BLOQUEADO: no se pudo actualizar la referencia remota. No se modifico nada.'
  exit 0
}

$RemoteHead = (& git -C $Repo rev-parse "origin/$Branch" 2>$null | Out-String).Trim()
if (-not $RemoteHead) {
  Write-Host 'BLOQUEADO: no se pudo resolver el HEAD remoto. No se modifico nada.'
  exit 0
}

$Allowed = @(
  '.github/workflows/orbit360-powershell-produccion-ays-smoke.yml',
  'tools/orbit360-diagnosticar-ultimo-fallo-op2.ps1',
  'tools/orbit360-launch-op2-final-delta-safe.ps1',
  'tools/orbit360-run-op2-final-delta-safe.ps1',
  'tools/orbit360-validar-resume-evidence-op1-op2-v1218.mjs'
)
$Changed = @(& git -C $Repo diff --name-only "$PreviouslyValidatedHead..$RemoteHead" 2>$null)
$Unexpected = @($Changed | Where-Object { $_ -and $_ -notin $Allowed })
if ($Unexpected.Count -gt 0) {
  $Text = "BLOQUEADO: cambiaron archivos de aplicacion desde el HEAD validado: " + ($Unexpected -join ', ')
  $Text | Set-Clipboard
  Write-Host $Text
  exit 0
}

$RemoteScript = (& git -C $Repo show "origin/${Branch}:tools/orbit360-run-op2-final-delta-safe.ps1" 2>$null | Out-String)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($RemoteScript)) {
  Write-Host 'BLOQUEADO: no se pudo obtener el runner delta. No se modifico nada.'
  exit 0
}

$ExpectedAssignment = "`$ValidatedHead = '3f1bbcc675a20af059204741b0f273a57b390078'"
$ReplacementAssignment = "`$ValidatedHead = '$RemoteHead'"
if (-not $RemoteScript.Contains($ExpectedAssignment)) {
  Write-Host 'BLOQUEADO: el runner remoto no tiene el contrato de HEAD esperado.'
  exit 0
}

$PatchedScript = $RemoteScript.Replace($ExpectedAssignment,$ReplacementAssignment)
$TempScript = Join-Path $env:TEMP 'orbit360-run-op2-final-delta-safe-runtime.ps1'
[IO.File]::WriteAllText($TempScript,$PatchedScript,(New-Object Text.UTF8Encoding($false)))

$Tokens = $null
$Errors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
  $TempScript,
  [ref]$Tokens,
  [ref]$Errors
)
if ($Errors.Count -gt 0) {
  $Message = ($Errors | ForEach-Object { $_.Message }) -join ' | '
  "BLOQUEADO: sintaxis PowerShell invalida: $Message" | Set-Clipboard
  Write-Host "BLOQUEADO: sintaxis PowerShell invalida: $Message"
  exit 0
}

Write-Host 'Contrato delta verificado. Ejecutando cierre focalizado sin tocar el repositorio original.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TempScript -RepoPath $Repo
exit 0
