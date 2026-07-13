param(
  [string]$Repo = "C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core"
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'ays/backend-tenant-lab-v99-20260703'
$Reports = Join-Path $Repo '_orbit360_reports'
$App = Join-Path $Repo 'orbit360-platform'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$MasterReport = Join-Path $Reports "RESUME-ASEGURADORAS-OP2-$Stamp.txt"
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
    if ($Process.ExitCode -ne 0) { throw "$FailureMessage Exit code: $($Process.ExitCode)." }
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
  catch { return $false }
  finally { if ($Listener) { try { $Listener.Stop() } catch {} } }
}

function Resolve-VisualPort([int]$PreferredPort = 5000) {
  for ($Port = $PreferredPort; $Port -le ($PreferredPort + 40); $Port++) {
    if (Test-LocalPortAvailable $Port) { return $Port }
  }
  throw "No free loopback port was found between $PreferredPort and $($PreferredPort + 40)."
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

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
Set-Content -Path $MasterReport -Value '============================================================' -Encoding UTF8
Add-Report 'ORBIT 360 - RESUME ONLY INSURERS OP2 VISUAL GATE V1.218'
Add-Report ("Local time: {0}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ("Repo: {0}" -f $Repo)
Add-Report 'CRM OP1 is reused only if its previous 10/10 report is present and approved.'
Add-Report 'No deploy, production, merge, main, real data, commit or push.'
Add-Report '============================================================'

$AllOk = Run-Step '1. Verify repository, branch and prior CRM approval' {
  if (-not (Test-Path (Join-Path $Repo '.git'))) { throw "Git repository not found: $Repo" }
  Set-Location $Repo
  $Branch = (& git branch --show-current 2>$null).Trim()
  if ($Branch -ne $ExpectedBranch) { throw "Wrong branch: $Branch" }

  $CrmReport = Get-ChildItem $Reports -File -Filter 'VISUAL-CRM-OP1-*.txt' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $CrmReport) { throw 'No previous CRM visual report was found. The common runner is required.' }
  $CrmText = Get-Content $CrmReport.FullName -Raw -Encoding UTF8
  if ($CrmText -notmatch 'Resumen:\s*10/10 escenarios aprobados' -or
      $CrmText -notmatch 'RESULTADO CRM OP-1:\s*VALIDACIÓN VISUAL AUTOMÁTICA APROBADA') {
    throw "The latest CRM report is not approved: $($CrmReport.FullName)"
  }
  Add-Report "CRM reused without rerun: $($CrmReport.FullName)"
}

if ($AllOk) {
  $AllOk = Run-Step '2. Confirm integration remains idempotent' {
    $Integration = Join-Path $Repo 'tools\orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1'
    Invoke-CapturedNative 'powershell' @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Integration,'-Repo',$Repo) 'Safe integration failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '3. Validate the corrected visual harness contract' {
    $Validator = Join-Path $Repo 'tools\orbit360-validar-smoke-aseguradoras-op2-v1218.mjs'
    Invoke-CapturedNative 'node' @($Validator,$Repo) 'Smoke harness contract failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '4. Validate Insurers OP2 and resource access policy' {
    Invoke-CapturedNative 'node' @((Join-Path $Repo 'tools\orbit360-validar-aseguradoras-op2.mjs'),$App) 'Insurers OP2 validation failed.'
    Invoke-CapturedNative 'node' @((Join-Path $Repo 'tools\orbit360-validar-politica-recursos-aseguradoras-v1218.mjs'),$App) 'Account and credential policy validation failed.'
  }
}

if ($AllOk) {
  $AllOk = Run-Step '5. Select a safe visual port automatically' {
    $script:VisualPort = Resolve-VisualPort 5000
    Add-Report "Selected visual URL: http://127.0.0.1:$script:VisualPort"
  }
}

if ($AllOk) {
  $AllOk = Run-Step '6. Run only the Insurers OP2 visual matrix' {
    $Smoke = Join-Path $Repo 'tools\orbit360-smoke-visual-aseguradoras-op2.mjs'
    Invoke-CapturedNative 'node' @($Smoke,'--repo',$Repo,'--app',$App,'--port',[string]$script:VisualPort,'--skip-validators') 'Insurers OP2 visual matrix failed.'
  }
}

Run-Step '7. Final evidence paths' {
  Add-Report ("Final HEAD: {0}" -f ((& git rev-parse HEAD 2>$null).Trim()))
  Add-Report 'Latest Insurers evidence:'
  Get-ChildItem $Reports -Directory -Filter 'VISUAL-ASEGURADORAS-OP2-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 2 |
    ForEach-Object { Add-Report $_.FullName }
} | Out-Null

Add-Report ''
if ($AllOk) {
  Add-Report 'RESULT OP2 RESUME: AUTOMATIC VISUAL VALIDATION PASSED'
  Add-Report 'CRM OP1 was not rerun; its previous 10/10 evidence was reused.'
  Add-Report 'Real GT/CO dry-runs were not executed.'
}
else {
  Add-Report 'RESULT OP2 RESUME: BLOCKED'
  Add-Report 'Execution stopped at the first real failing step.'
}
Add-Report 'No deploy, production, merge, main, secrets, real data, automatic commit or push.'
Add-Report ("Master report: {0}" -f $MasterReport)

try {
  Get-Content $MasterReport -Raw -Encoding UTF8 | Set-Clipboard
  notepad $MasterReport
} catch {}

if (-not $AllOk) { exit 1 }
