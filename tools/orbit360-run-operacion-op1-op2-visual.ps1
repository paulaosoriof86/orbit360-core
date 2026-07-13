param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RUN-OP1-OP2-$Stamp.txt"
$App = Join-Path $Repo 'orbit360-platform'

try {
  [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  chcp 65001 | Out-Null
} catch {}

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
  }
  catch {
    Add-Report ("ERROR: {0}" -f $_.Exception.Message)
    return $false
  }
}

function Quote-NativeArg([string]$Value) {
  if ($Value -notmatch '[\s"]') { return $Value }
  return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-CapturedNative(
  [string]$FilePath,
  [string[]]$Arguments,
  [string]$FailureMessage
) {
  $Token = [guid]::NewGuid().ToString('N')
  $Stdout = Join-Path $Reports ("native-$Token.out.txt")
  $Stderr = Join-Path $Reports ("native-$Token.err.txt")
  $ArgumentText = (($Arguments | ForEach-Object { Quote-NativeArg ([string]$_) }) -join ' ')

  try {
    $Process = Start-Process -FilePath $FilePath `
      -ArgumentList $ArgumentText `
      -WorkingDirectory $Repo `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $Stdout `
      -RedirectStandardError $Stderr

    if (Test-Path $Stdout) {
      $Text = Get-Content $Stdout -Raw -Encoding UTF8
      if ($Text) { Add-Report $Text.TrimEnd() }
    }
    if (Test-Path $Stderr) {
      $Text = Get-Content $Stderr -Raw -Encoding UTF8
      if ($Text) { Add-Report $Text.TrimEnd() }
    }

    if ($Process.ExitCode -ne 0) {
      throw "$FailureMessage Exit code: $($Process.ExitCode)."
    }
    return $Process.ExitCode
  }
  finally {
    Remove-Item $Stdout,$Stderr -Force -ErrorAction SilentlyContinue
  }
}

function Clear-OrbitPort5000 {
  $Listeners = @()
  try { $Listeners = @(Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue) } catch {}
  if (-not $Listeners.Count) { return }

  $OwnerPids = @($Listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($PidValue in $OwnerPids) {
    $Proc = $null
    try { $Proc = Get-CimInstance Win32_Process -Filter "ProcessId = $PidValue" -ErrorAction Stop } catch {}
    $Command = if ($Proc) { [string]$Proc.CommandLine } else { '' }
    $Name = if ($Proc) { [string]$Proc.Name } else { "PID $PidValue" }
    $Identity = "$Name $Command"
    Add-Report "Port 5000 owner: $Name | PID $PidValue"
    Add-Report "Command: $Command"

    if ($Identity -match '(?i)(orbit360|firebase\s+(serve|emulators)|http-server|serve\s+.*orbit360-platform|smoke-visual-(crm-op1|aseguradoras-op2))') {
      Stop-Process -Id $PidValue -Force -ErrorAction Stop
      Add-Report "Known Orbit local server stopped: PID $PidValue"
    }
    else {
      throw "Port 5000 belongs to another application. It was not stopped: $Name (PID $PidValue)."
    }
  }
  Start-Sleep -Milliseconds 700
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - COMMON RUN CRM OP1 + INSURERS OP2 V1.218'
Add-Report ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report ("Required branch: {0}" -f $ExpectedBranch)
Add-Report 'Visual URL: http://localhost:5000'
Add-Report 'Accounts: all directory viewers. Credentials: Direction/Admin/Operations.'
Add-Report 'Demo/fictitious mode. No deploy, production, main, secrets, real data, commit or push.'
Add-Report '============================================================'

$AllOk = Run-Step '1. Verify repository and branch' {
  if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Git repository not found: $Repo" }
  Set-Location $Repo
  $Branch = (& git branch --show-current 2>$null).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'Unable to read current branch.' }
  Add-Report "Current branch: $Branch"
  if ($Branch -ne $ExpectedBranch) { throw "Wrong branch. Required: $ExpectedBranch" }

  $Status = @(& git status --short 2>$null)
  if ($Status.Count) {
    Add-Report 'Local untracked/modified paths detected and preserved:'
    $Status | ForEach-Object { Add-Report ([string]$_) }
  }
}

if ($AllOk) {
  $AllOk = Run-Step '2. Safe fast-forward sync' {
    $HeadBefore = (& git rev-parse HEAD 2>$null).Trim()
    Invoke-CapturedNative 'git' @('-C',$Repo,'fetch','--quiet','origin',$ExpectedBranch) 'git fetch failed.' | Out-Null
    Invoke-CapturedNative 'git' @('-C',$Repo,'pull','--ff-only','--quiet','origin',$ExpectedBranch) 'Safe fast-forward was blocked. Nothing was forced.' | Out-Null
    $HeadAfter = (& git rev-parse HEAD 2>$null).Trim()
    Add-Report "HEAD before: $HeadBefore"
    Add-Report "HEAD after:  $HeadAfter"

    if ($HeadAfter -ne $HeadBefore -and $env:ORBIT_OP12_REEXEC -ne '1') {
      Add-Report 'Runner updated during sync. Relaunching the updated file once.'
      $env:ORBIT_OP12_REEXEC = '1'
      try {
        Invoke-CapturedNative 'powershell' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-Repo',$Repo) 'Updated runner failed.' | Out-Null
      }
      finally {
        Remove-Item Env:ORBIT_OP12_REEXEC -ErrorAction SilentlyContinue
      }
      Add-Report 'Updated runner completed. This bootstrap instance will stop now.'
      try {
        Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
        notepad $MasterReport
      } catch {}
      exit 0
    }
  }
}

if ($AllOk) {
  $AllOk = Run-Step '3. Integrate CRM OP1 and Insurers OP2 with backup' {
    $Script = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
    if (-not (Test-Path $Script)) { throw "Integration script missing: $Script" }
    Invoke-CapturedNative 'powershell' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Script,'-Repo',$Repo) 'Safe index integration failed.' | Out-Null
  }
}

if ($AllOk) {
  $AllOk = Run-Step '4. Validate account and credential policy' {
    $Validator = Join-Path $Repo 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'
    if (-not (Test-Path $Validator)) { throw "Policy validator missing: $Validator" }
    Invoke-CapturedNative 'node' @($Validator,$App) 'Account/credential policy validation failed.' | Out-Null
  }
}

if ($AllOk) {
  $AllOk = Run-Step '5. Prepare localhost port 5000' { Clear-OrbitPort5000 }
}

if ($AllOk) {
  $AllOk = Run-Step '6. Run CRM OP1 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-crm-op1.mjs'
    if (-not (Test-Path $Smoke)) { throw "CRM smoke missing: $Smoke" }
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port','5000') 'CRM OP1 visual matrix failed.' | Out-Null
  }
}

if ($AllOk) {
  $AllOk = Run-Step '7. Release localhost port 5000' { Clear-OrbitPort5000 }
}

if ($AllOk) {
  $AllOk = Run-Step '8. Run Insurers OP2 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-aseguradoras-op2.mjs'
    if (-not (Test-Path $Smoke)) { throw "Insurers smoke missing: $Smoke" }
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port','5000') 'Insurers OP2 visual matrix failed.' | Out-Null
  }
}

Run-Step '9. Final Git state and evidence paths' {
  Set-Location $Repo
  Add-Report ("Final branch: {0}" -f ((& git branch --show-current 2>$null).Trim()))
  Add-Report ("Final HEAD: {0}" -f ((& git rev-parse HEAD 2>$null).Trim()))
  $Status = @(& git status --short 2>$null)
  if ($Status.Count) {
    Add-Report 'Preserved local paths and expected index/report changes:'
    $Status | ForEach-Object { Add-Report ([string]$_) }
  }
  else { Add-Report 'No local changes.' }
  Add-Report 'Latest visual evidence folders:'
  Get-ChildItem $Reports -Directory -Filter 'VISUAL-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 4 |
    ForEach-Object { Add-Report $_.FullName }
} | Out-Null

Add-Report ''
if ($AllOk) {
  Add-Report 'RESULT OP1+OP2: AUTOMATIC VALIDATION PASSED'
  Add-Report 'Remaining gate: human review of screenshots before closing both modules.'
  Add-Report 'Real GT/CO dry-runs were not executed.'
}
else {
  Add-Report 'RESULT OP1+OP2: BLOCKED'
  Add-Report 'Execution stopped at the first failing critical step. Later steps were not run.'
}
Add-Report 'No deploy, production, merge, main, secrets, real data, automatic commit or push.'
Add-Report ("Master report: {0}" -f $MasterReport)

try {
  Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
  notepad $MasterReport
} catch {}

if (-not $AllOk) { exit 1 }
