param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RUN-OP1-OP2-$Stamp.txt"
$App = Join-Path $Repo 'orbit360-platform'
$script:VisualPort = 0

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

function Test-LocalPortAvailable([int]$Port) {
  $Listener = $null
  try {
    $Listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $Listener.Start()
    return $true
  }
  catch {
    return $false
  }
  finally {
    if ($Listener) {
      try { $Listener.Stop() } catch {}
    }
  }
}

function Describe-PortOwner([int]$Port) {
  $Listeners = @()
  try {
    $Listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  } catch {}

  if (-not $Listeners.Count) {
    return "Port $Port is occupied; owner details are unavailable."
  }

  $Parts = @()
  foreach ($Listener in $Listeners) {
    $PidValue = $Listener.OwningProcess
    $Proc = $null
    try { $Proc = Get-CimInstance Win32_Process -Filter "ProcessId = $PidValue" -ErrorAction Stop } catch {}
    $Name = if ($Proc) { [string]$Proc.Name } else { "PID $PidValue" }
    $Command = if ($Proc) { [string]$Proc.CommandLine } else { '' }
    $Parts += "$Name | PID $PidValue | $Command"
  }
  return "Port $Port preserved for another application: " + ($Parts -join ' || ')
}

function Resolve-VisualPort([int]$PreferredPort = 5000) {
  for ($Port = $PreferredPort; $Port -le ($PreferredPort + 40); $Port++) {
    if (Test-LocalPortAvailable $Port) {
      if ($Port -eq $PreferredPort) {
        Add-Report "Preferred visual port is free: $Port"
      }
      else {
        Add-Report "Automatic fallback selected: $Port"
      }
      return $Port
    }
    Add-Report (Describe-PortOwner $Port)
  }
  throw "No free loopback port was found between $PreferredPort and $($PreferredPort + 40)."
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - COMMON RUN CRM OP1 + INSURERS OP2 V1.218'
Add-Report ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report ("Required branch: {0}" -f $ExpectedBranch)
Add-Report 'Visual URL: automatic loopback port (5000 preferred; safe fallback enabled)'
Add-Report 'Accounts: all directory viewers. Credentials: Direction/Admin/Operations.'
Add-Report 'Demo/fictitious mode. No deploy, production, main, secrets, real data, commit or push.'
Add-Report 'Other local applications and their ports are preserved; no process is stopped.'
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
      Add-Report 'Updated runner completed. Bootstrap instance stopped without duplicating the visual run.'
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
  $AllOk = Run-Step '5. Select an available visual port automatically' {
    $script:VisualPort = Resolve-VisualPort 5000
    Add-Report "Selected visual URL: http://127.0.0.1:$script:VisualPort"
  }
}

if ($AllOk) {
  $AllOk = Run-Step '6. Run CRM OP1 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-crm-op1.mjs'
    if (-not (Test-Path $Smoke)) { throw "CRM smoke missing: $Smoke" }
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port',[string]$script:VisualPort) 'CRM OP1 visual matrix failed.' | Out-Null
  }
}

if ($AllOk) {
  $AllOk = Run-Step '7. Confirm or reselect visual port for Insurers' {
    $script:VisualPort = Resolve-VisualPort $script:VisualPort
    Add-Report "Insurers visual URL: http://127.0.0.1:$script:VisualPort"
  }
}

if ($AllOk) {
  $AllOk = Run-Step '8. Run Insurers OP2 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-aseguradoras-op2.mjs'
    if (-not (Test-Path $Smoke)) { throw "Insurers smoke missing: $Smoke" }
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port',[string]$script:VisualPort) 'Insurers OP2 visual matrix failed.' | Out-Null
  }
}

Run-Step '9. Final Git state and evidence paths' {
  Set-Location $Repo
  Add-Report ("Final branch: {0}" -f ((& git branch --show-current 2>$null).Trim()))
  Add-Report ("Final HEAD: {0}" -f ((& git rev-parse HEAD 2>$null).Trim()))
  if ($script:VisualPort) { Add-Report "Last selected visual port: $script:VisualPort" }
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
